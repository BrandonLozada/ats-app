import * as dotenv from "dotenv";
import { Client } from "pg";
dotenv.config();

export interface BackfillMappingConfig {
  /**
   * Explicit mapping by JobPosting ID or Slug to target LegalEntity and Location.
   * Required when a Tenant has multiple LegalEntities and historical mapping is ambiguous.
   */
  jobPostingMappings?: Record<
    string,
    {
      legalEntityId: string;
      locationId: string;
      pipelineVersionId?: string;
      openings?: number;
    }
  >;
  /**
   * Optional scoped list of JobPosting IDs to process. If omitted, processes all JobPostings.
   */
  jobPostingIds?: string[];
}

export interface BackfillResult {
  status: "SUCCESS" | "BLOCKED";
  inspectedCount: number;
  migratedCount: number;
  skippedCount: number;
  blockedReason?: string;
  unresolvedRows?: Array<{
    jobPostingId: string;
    jobPostingSlug: string;
    jobPostingTitle: string;
    tenantId: string;
    candidateLegalEntities: Array<{
      id: string;
      name: string;
      code: string;
      locationId: string;
      locationName: string;
    }>;
  }>;
}

/**
 * I6-S4-T02 Controlled Vacancy Backfill Engine
 *
 * Implements transaction-safe, idempotent backfill from legacy JobPosting
 * to canonical Vacancy & VacancyLocation.
 *
 * Fails closed if:
 * - Tenant cannot be deterministically resolved.
 * - Department does not belong to resolved Tenant.
 * - HiringPipeline does not belong to resolved Tenant.
 * - PipelineVersion is missing, not PUBLISHED, or ambiguous.
 * - LegalEntity / Location mapping has no evidence and multiple candidates exist.
 */
export async function runVacancyBackfill(
  config?: BackfillMappingConfig,
  clientInstance?: Client
): Promise<BackfillResult> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && !clientInstance) throw new Error("DATABASE_URL is not set");

  const client = clientInstance ?? new Client({ connectionString: dbUrl });
  const shouldDisconnect = !clientInstance;

  if (shouldDisconnect) {
    await client.connect();
  }

  let transactionStarted = false;

  try {
    console.log("=== I6-S4-T02: VACANCY BACKFILL INSPECTION & EXECUTION ===");

    // 1. Inspect legacy JobPostings (filtered if jobPostingIds provided)
    const jobPostingsRes =
      config?.jobPostingIds && config.jobPostingIds.length > 0
        ? await client.query(
            `
          SELECT 
            id,
            title,
            slug,
            description,
            status,
            employment_type,
            is_remote,
            department_id,
            organization_id,
            pipeline_id,
            total_positions,
            published_at,
            created_at,
            updated_at
          FROM job_postings
          WHERE id = ANY($1::uuid[])
          ORDER BY created_at ASC;
        `,
            [config.jobPostingIds]
          )
        : await client.query(`
          SELECT 
            id,
            title,
            slug,
            description,
            status,
            employment_type,
            is_remote,
            department_id,
            organization_id,
            pipeline_id,
            total_positions,
            published_at,
            created_at,
            updated_at
          FROM job_postings
          ORDER BY created_at ASC;
        `);

    const jobPostings = jobPostingsRes.rows;
    console.log(`Found ${jobPostings.length} JobPosting row(s) to inspect.`);

    if (jobPostings.length === 0) {
      console.log("No legacy JobPostings found. Backfill completed with zero work.");
      return {
        status: "SUCCESS",
        inspectedCount: 0,
        migratedCount: 0,
        skippedCount: 0,
      };
    }

interface JobPostingDbRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  employment_type: string;
  is_remote: boolean | null;
  department_id: string;
  organization_id: string;
  pipeline_id: string;
  total_positions: number | null;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const SUPPORTED_VACANCY_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"] as const;
type SupportedVacancyStatus = (typeof SUPPORTED_VACANCY_STATUSES)[number];

    // Diagnostic pre-check: verify each JobPosting's mapping readiness
    const resolvedJobPlans: Array<{
      jp: JobPostingDbRow;
      tenantId: string;
      departmentId: string;
      pipelineVersionId: string;
      legalEntityId: string;
      locationId: string;
      openings: number;
      targetPublishedAt: Date | null;
    }> = [];

    const unresolvedRows: NonNullable<BackfillResult["unresolvedRows"]> = [];

    for (const jp of jobPostings) {
      console.log(`\nInspecting JobPosting: "${jp.title}" (${jp.slug}, ID: ${jp.id})`);

      // 0. Validate Status (Fail-closed on unsupported/unknown status)
      if (!SUPPORTED_VACANCY_STATUSES.includes(jp.status as SupportedVacancyStatus)) {
        throw new Error(
          `FAIL-CLOSED: Unsupported legacy JobPosting status "${jp.status}" on JobPosting "${jp.title}" (${jp.id}). Allowed statuses: ${SUPPORTED_VACANCY_STATUSES.join(", ")}.`
        );
      }

      // Compute canonical publishedAt without inventing timestamps
      const targetPublishedAt: Date | null =
        jp.status === "PUBLISHED" && jp.published_at != null
          ? new Date(jp.published_at)
          : null;

      // A. Tenant Resolution from Department & Pipeline
      if (!jp.department_id) {
        throw new Error(
          `FAIL-CLOSED: JobPosting "${jp.title}" (${jp.id}) has no department_id.`
        );
      }

      const deptRes = await client.query(
        `SELECT id, tenant_id, name, slug FROM departments WHERE id = $1;`,
        [jp.department_id]
      );

      if (deptRes.rows.length === 0) {
        throw new Error(
          `FAIL-CLOSED: Department ${jp.department_id} referenced by JobPosting "${jp.title}" not found.`
        );
      }

      const department = deptRes.rows[0];
      const tenantId = department.tenant_id;
      console.log(`  Resolved Tenant ID: ${tenantId} (from Department "${department.name}")`);

      // Verify Pipeline belongs to same Tenant
      const pipeRes = await client.query(
        `SELECT id, tenant_id, name FROM hiring_pipelines WHERE id = $1;`,
        [jp.pipeline_id]
      );

      if (pipeRes.rows.length === 0) {
        throw new Error(
          `FAIL-CLOSED: HiringPipeline ${jp.pipeline_id} referenced by JobPosting "${jp.title}" not found.`
        );
      }

      const pipeline = pipeRes.rows[0];
      if (pipeline.tenant_id !== tenantId) {
        throw new Error(
          `FAIL-CLOSED: Pipeline tenant (${pipeline.tenant_id}) does not match Department tenant (${tenantId}) for JobPosting "${jp.title}".`
        );
      }

      // B. PipelineVersion Mapping (Explicit pin takes precedence; generic fallback requires unique published version)
      const explicitMapping =
        config?.jobPostingMappings?.[jp.id] ??
        config?.jobPostingMappings?.[jp.slug];

      let selectedVersion: {
        id: string;
        version: number;
        status: string;
        published_at: Date | string | null;
      };

      if (explicitMapping?.pipelineVersionId) {
        const versionRes = await client.query(
          `
          SELECT id, tenant_id, pipeline_id, version, status, published_at 
          FROM pipeline_versions 
          WHERE id = $1;
        `,
          [explicitMapping.pipelineVersionId]
        );

        if (versionRes.rows.length === 0) {
          throw new Error(
            `FAIL-CLOSED: Explicit PipelineVersion ${explicitMapping.pipelineVersionId} referenced by JobPosting "${jp.title}" not found.`
          );
        }

        const pv = versionRes.rows[0];

        if (pv.tenant_id !== tenantId) {
          throw new Error(
            `FAIL-CLOSED: Explicit PipelineVersion ${pv.id} tenant (${pv.tenant_id}) does not match Department tenant (${tenantId}) for JobPosting "${jp.title}".`
          );
        }

        if (pv.pipeline_id !== pipeline.id) {
          throw new Error(
            `FAIL-CLOSED: Explicit PipelineVersion ${pv.id} pipeline (${pv.pipeline_id}) does not match JobPosting pipeline (${pipeline.id}) for JobPosting "${jp.title}".`
          );
        }

        if (pv.status !== "PUBLISHED") {
          throw new Error(
            `FAIL-CLOSED: Explicit PipelineVersion ${pv.id} for JobPosting "${jp.title}" has status "${pv.status}". Expected "PUBLISHED".`
          );
        }

        selectedVersion = pv;
        console.log(
          `  Explicit PipelineVersion pinned: v${selectedVersion.version} (${selectedVersion.id}, Status: ${selectedVersion.status})`
        );
      } else {
        const versionsRes = await client.query(
          `
          SELECT id, version, status, published_at 
          FROM pipeline_versions 
          WHERE pipeline_id = $1 
          ORDER BY version ASC;
        `,
          [pipeline.id]
        );

        const publishedVersions = versionsRes.rows.filter(
          (v: { status: string }) => v.status === "PUBLISHED"
        );

        if (publishedVersions.length === 0) {
          throw new Error(
            `FAIL-CLOSED: No PUBLISHED PipelineVersion found for pipeline "${pipeline.name}" (${pipeline.id}).`
          );
        }

        if (publishedVersions.length > 1) {
          throw new Error(
            `FAIL-CLOSED: Multiple PUBLISHED PipelineVersions found for pipeline "${pipeline.name}" (${pipeline.id}). Deterministic resolution impossible without historical version pin.`
          );
        }

        selectedVersion = publishedVersions[0];
        console.log(
          `  Resolved PipelineVersion: v${selectedVersion.version} (${selectedVersion.id}, Status: ${selectedVersion.status})`
        );
      }

      // C. LegalEntity & Location Mapping Inspection

      if (explicitMapping) {
        // Validate explicit mapping belongs to resolved Tenant
        const leCheck = await client.query(
          `SELECT id, tenant_id, name FROM legal_entities WHERE id = $1 AND tenant_id = $2;`,
          [explicitMapping.legalEntityId, tenantId]
        );
        if (leCheck.rows.length === 0) {
          throw new Error(
            `FAIL-CLOSED: Explicit LegalEntity ${explicitMapping.legalEntityId} does not belong to Tenant ${tenantId}.`
          );
        }

        const locCheck = await client.query(
          `SELECT id, tenant_id, legal_entity_id, name FROM locations WHERE id = $1 AND tenant_id = $2 AND legal_entity_id = $3;`,
          [explicitMapping.locationId, tenantId, explicitMapping.legalEntityId]
        );
        if (locCheck.rows.length === 0) {
          throw new Error(
            `FAIL-CLOSED: Explicit Location ${explicitMapping.locationId} does not belong to Tenant ${tenantId} and LegalEntity ${explicitMapping.legalEntityId}.`
          );
        }

        // Headcount resolution precedence:
        // 1. explicitMapping.openings
        // 2. legacy JobPosting.total_positions
        // 3. transitional canonical default = 1
        const rawOpenings = explicitMapping.openings ?? jp.total_positions ?? 1;

        if (!Number.isInteger(rawOpenings) || rawOpenings < 1) {
          throw new Error(
            `FAIL-CLOSED: Invalid openings value (${rawOpenings}) for JobPosting "${jp.title}" (${jp.id}, slug: "${jp.slug}"). Openings must be an integer >= 1.`
          );
        }

        const openings = rawOpenings;

        resolvedJobPlans.push({
          jp,
          tenantId,
          departmentId: department.id,
          pipelineVersionId: selectedVersion.id,
          legalEntityId: explicitMapping.legalEntityId,
          locationId: explicitMapping.locationId,
          openings,
          targetPublishedAt,
        });

        console.log(
          `  Explicit LegalEntity/Location mapped: LegalEntity ${explicitMapping.legalEntityId}, Location ${explicitMapping.locationId}, Openings: ${openings}`
        );
        continue;
      }

      // No explicit mapping provided -> Check available LegalEntities under Tenant
      const legalEntitiesRes = await client.query(
        `
        SELECT 
          le.id AS le_id,
          le.name AS le_name,
          le.code AS le_code,
          loc.id AS loc_id,
          loc.name AS loc_name
        FROM legal_entities le
        JOIN locations loc ON loc.legal_entity_id = le.id AND loc.tenant_id = le.tenant_id
        WHERE le.tenant_id = $1;
      `,
        [tenantId]
      );

      const candidateMappings = legalEntitiesRes.rows.map((row) => ({
        id: row.le_id,
        name: row.le_name,
        code: row.le_code,
        locationId: row.loc_id,
        locationName: row.loc_name,
      }));

      // Invariant: No Invented Organizational Data
      // If there are multiple candidate LegalEntities and no evidence/mapping exists:
      // FAIL-CLOSED. Do not guess. Do not automatically choose the first one.
      unresolvedRows.push({
        jobPostingId: jp.id,
        jobPostingSlug: jp.slug,
        jobPostingTitle: jp.title,
        tenantId,
        candidateLegalEntities: candidateMappings,
      });

      console.warn(
        `  ⚠️ AMBIGUOUS LEGAL ENTITY / LOCATION: Found ${candidateMappings.length} candidate mapping(s) under Tenant ${tenantId}:`,
        candidateMappings.map((c) => `${c.name} (${c.code}) -> Location: ${c.locationName}`)
      );
    }

    // 2. Evaluate Blockers
    if (unresolvedRows.length > 0) {
      const blockedMsg =
        `BACKFILL BLOCKED — LEGAL ENTITY / LOCATION MAPPING REQUIRED: ` +
        `${unresolvedRows.length} JobPosting(s) cannot be mapped to a LegalEntity/Location without inventing organizational data.`;
      console.error(`\n❌ ${blockedMsg}`);
      console.error(JSON.stringify(unresolvedRows, null, 2));

      return {
        status: "BLOCKED",
        inspectedCount: jobPostings.length,
        migratedCount: 0,
        skippedCount: 0,
        blockedReason: blockedMsg,
        unresolvedRows,
      };
    }

    // 3. All rows deterministically resolved -> Execute atomic, idempotent migration
    console.log(
      `\nAll ${resolvedJobPlans.length} JobPosting(s) deterministically resolved. Beginning backfill transaction...`
    );

    await client.query("BEGIN;");
    transactionStarted = true;

    let migratedCount = 0;
    let skippedCount = 0;

    for (const plan of resolvedJobPlans) {
      const {
        jp,
        tenantId,
        departmentId,
        pipelineVersionId,
        legalEntityId,
        locationId,
        openings,
        targetPublishedAt,
      } = plan;

      // Idempotency check on Vacancy: [tenant_id, slug]
      const existingVacRes = await client.query(
        `
        SELECT 
          id,
          tenant_id,
          department_id,
          legal_entity_id,
          pipeline_version_id,
          title,
          slug,
          description,
          employment_type,
          is_remote,
          openings,
          status,
          published_at
        FROM vacancies 
        WHERE tenant_id = $1 AND slug = $2;
      `,
        [tenantId, jp.slug]
      );

      let vacancyId: string;

      if (existingVacRes.rows.length > 0) {
        const existingVac = existingVacRes.rows[0];
        const conflicts: string[] = [];

        if (existingVac.tenant_id !== tenantId) {
          conflicts.push(`tenantId (existing: ${existingVac.tenant_id}, expected: ${tenantId})`);
        }
        if (existingVac.department_id !== departmentId) {
          conflicts.push(`departmentId (existing: ${existingVac.department_id}, expected: ${departmentId})`);
        }
        if (existingVac.legal_entity_id !== legalEntityId) {
          conflicts.push(`legalEntityId (existing: ${existingVac.legal_entity_id}, expected: ${legalEntityId})`);
        }
        if (existingVac.pipeline_version_id !== pipelineVersionId) {
          conflicts.push(`pipelineVersionId (existing: ${existingVac.pipeline_version_id}, expected: ${pipelineVersionId})`);
        }
        if (existingVac.title !== jp.title) {
          conflicts.push(`title (existing: "${existingVac.title}", expected: "${jp.title}")`);
        }
        if (existingVac.slug !== jp.slug) {
          conflicts.push(`slug (existing: "${existingVac.slug}", expected: "${jp.slug}")`);
        }
        if (existingVac.description !== jp.description) {
          conflicts.push(`description mismatch`);
        }
        if (existingVac.employment_type !== jp.employment_type) {
          conflicts.push(`employmentType (existing: ${existingVac.employment_type}, expected: ${jp.employment_type})`);
        }
        if (Boolean(existingVac.is_remote) !== Boolean(jp.is_remote)) {
          conflicts.push(`isRemote (existing: ${existingVac.is_remote}, expected: ${jp.is_remote})`);
        }
        if (Number(existingVac.openings) !== Number(openings)) {
          conflicts.push(`openings (existing: ${existingVac.openings}, expected: ${openings})`);
        }
        if (existingVac.status !== jp.status) {
          conflicts.push(`status (existing: ${existingVac.status}, expected: ${jp.status})`);
        }

        const existingPubTime = existingVac.published_at ? new Date(existingVac.published_at).getTime() : null;
        const expectedPubTime = targetPublishedAt ? targetPublishedAt.getTime() : null;
        if (existingPubTime !== expectedPubTime) {
          conflicts.push(
            `publishedAt (existing: ${existingVac.published_at ? new Date(existingVac.published_at).toISOString() : "null"}, expected: ${targetPublishedAt ? targetPublishedAt.toISOString() : "null"})`
          );
        }

        if (conflicts.length > 0) {
          throw new Error(
            `FAIL-CLOSED: Conflicting canonical projection found for Vacancy [tenant_id: ${tenantId}, slug: ${jp.slug}]. Conflicts: ${conflicts.join("; ")}.`
          );
        }

        vacancyId = existingVac.id;
        console.log(
          `  Vacancy for "${jp.slug}" already exists (${vacancyId}) with exact canonical projection. Verifying VacancyLocation...`
        );
      } else {
        // Insert Vacancy with validated status and exact targetPublishedAt
        const insertVacRes = await client.query(
          `
          INSERT INTO vacancies (
            tenant_id,
            department_id,
            legal_entity_id,
            pipeline_version_id,
            title,
            slug,
            description,
            employment_type,
            is_remote,
            openings,
            status,
            published_at,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id;
        `,
          [
            tenantId,
            departmentId,
            legalEntityId,
            pipelineVersionId,
            jp.title,
            jp.slug,
            jp.description,
            jp.employment_type,
            jp.is_remote ?? false,
            openings,
            jp.status,
            targetPublishedAt,
            jp.created_at ?? new Date(),
            jp.updated_at ?? new Date(),
          ]
        );

        vacancyId = insertVacRes.rows[0].id;
        migratedCount++;
        console.log(`  Inserted Vacancy for "${jp.title}" (${vacancyId}).`);
      }

      // Idempotency check on VacancyLocation: [vacancy_id, location_id]
      const existingVlRes = await client.query(
        `
        SELECT 
          id, 
          tenant_id,
          vacancy_id,
          legal_entity_id,
          location_id,
          openings 
        FROM vacancy_locations 
        WHERE vacancy_id = $1 AND location_id = $2;
      `,
        [vacancyId, locationId]
      );

      if (existingVlRes.rows.length > 0) {
        const existingVl = existingVlRes.rows[0];
        const vlConflicts: string[] = [];

        if (existingVl.tenant_id !== tenantId) {
          vlConflicts.push(`tenantId (existing: ${existingVl.tenant_id}, expected: ${tenantId})`);
        }
        if (existingVl.legal_entity_id !== legalEntityId) {
          vlConflicts.push(`legalEntityId (existing: ${existingVl.legal_entity_id}, expected: ${legalEntityId})`);
        }
        if (existingVl.location_id !== locationId) {
          vlConflicts.push(`locationId (existing: ${existingVl.location_id}, expected: ${locationId})`);
        }
        if (Number(existingVl.openings) !== Number(openings)) {
          vlConflicts.push(`openings (existing: ${existingVl.openings}, expected: ${openings})`);
        }

        if (vlConflicts.length > 0) {
          throw new Error(
            `FAIL-CLOSED: Conflicting VacancyLocation found for [vacancy_id: ${vacancyId}, location_id: ${locationId}]. Conflicts: ${vlConflicts.join("; ")}.`
          );
        }

        skippedCount++;
        console.log(
          `  VacancyLocation already exists with matching allocation (${openings}). Skipped.`
        );
      } else {
        await client.query(
          `
          INSERT INTO vacancy_locations (
            tenant_id,
            vacancy_id,
            legal_entity_id,
            location_id,
            openings
          ) VALUES ($1, $2, $3, $4, $5);
        `,
          [tenantId, vacancyId, legalEntityId, locationId, openings]
        );
        console.log(
          `  Inserted VacancyLocation for Location ${locationId} with allocated openings: ${openings}.`
        );
      }

      // Invariant verification within transaction:
      // SUM(VacancyLocation.openings) = Vacancy.openings
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(openings), 0) AS sum_openings FROM vacancy_locations WHERE vacancy_id = $1;`,
        [vacancyId]
      );
      const allocatedSum = parseInt(sumRes.rows[0].sum_openings, 10);
      if (allocatedSum !== openings) {
        throw new Error(
          `FAIL-CLOSED: Allocation sum invariant violated for Vacancy ${vacancyId}: SUM(${allocatedSum}) != Vacancy.openings(${openings}).`
        );
      }
    }

    await client.query("COMMIT;");
    transactionStarted = false;
    console.log("=== BACKFILL TRANSACTION COMMITTED SUCCESSFULLY ===");

    return {
      status: "SUCCESS",
      inspectedCount: jobPostings.length,
      migratedCount,
      skippedCount,
    };
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK;");
        transactionStarted = false;
      } catch (rollbackErr) {
        console.error("Rollback failed after backfill error:", rollbackErr);
      }
    }
    throw err;
  } finally {
    if (shouldDisconnect) {
      await client.end();
    }
  }
}

/**
 * Authoritative migration decision for legacy prototype JobPosting:
 * JobPosting: "Enfermera General" (32240aff-a254-4019-8863-7cb90784d449)
 * -> Tenant: AMA (e6759b00-099e-443a-8aa5-2bfc67b191ea)
 * -> LegalEntity: AMA Anáhuac (11111111-1111-4111-a111-111111111111)
 * -> Location: Anáhuac (33333333-3333-4333-a333-333333333333)
 * -> PipelineVersion: cacea55a-a043-425a-a54f-0f06c514aa1a (Default Hiring v1)
 * -> Openings: 1
 *
 * This mapping is an authorized migration decision for existing prototype data,
 * not inferred historical truth.
 */
export const AUTHORIZED_LEGACY_MAPPINGS: BackfillMappingConfig = {
  jobPostingIds: ["32240aff-a254-4019-8863-7cb90784d449"],
  jobPostingMappings: {
    "32240aff-a254-4019-8863-7cb90784d449": {
      legalEntityId: "11111111-1111-4111-a111-111111111111",
      locationId: "33333333-3333-4333-a333-333333333333",
      pipelineVersionId: "cacea55a-a043-425a-a54f-0f06c514aa1a",
      openings: 1,
    },
  },
};

// CLI Execution Entry Point
if (require.main === module) {
  runVacancyBackfill(AUTHORIZED_LEGACY_MAPPINGS)
    .then((result) => {
      console.log("\nBackfill Run Result:\n", JSON.stringify(result, null, 2));
      if (result.status === "BLOCKED") {
        process.exit(2);
      }
    })
    .catch((err) => {
      console.error("\nBackfill Execution Failed:\n", err);
      process.exit(1);
    });
}

