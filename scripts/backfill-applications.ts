import * as dotenv from "dotenv";
import { Client } from "pg";
dotenv.config();

export interface ApplicationBackfillConfig {
  /**
   * Explicit historical migration mapping keyed exclusively by legacy JobPosting ID.
   * Useful when explicit lineage must be pinned.
   */
  jobPostingToVacancyMap?: Record<string, string>;
  /**
   * Optional scoped list of Application IDs to process. If omitted, processes all Applications.
   */
  applicationIds?: string[];
  /**
   * For testing rollback behavior: if true, simulates an unhandled failure after mutations
   * but before transaction commit.
   */
  simulateFailureAfterUpdate?: boolean;
}

export interface ApplicationReadinessReport {
  totalApplications: number;
  tenantIdNullCount: number;
  vacancyIdNullCount: number;
  currentStageIdNullCount: number;
  candidateTenantMismatchCount: number;
  vacancyTenantMismatchCount: number;
  stageOutsidePipelineVersionCount: number;
  assignedVacancyLocationMismatchCount: number;
  stageHistoryTenantNullCount: number;
  activeDuplicateGroupsCount: number;
  terminalDuplicateGroupsCount: number;
  isT03Ready: boolean;
}

export interface ApplicationBackfillResult {
  status: "SUCCESS" | "BLOCKED";
  inspectedCount: number;
  migratedCount: number;
  skippedCount: number;
  blockedCount: number;
  blockedReason?: string;
  stageHistoryInspectedCount: number;
  stageHistoryMigratedCount: number;
  stageHistorySkippedCount: number;
  activeDuplicateGroupsCount: number;
  terminalDuplicateGroupsCount: number;
  readinessReport?: ApplicationReadinessReport;
}

interface ApplicationDbRow {
  id: string;
  candidate_id: string;
  job_posting_id: string | null;
  vacancy_id: string | null;
  stage_id: string | null;
  current_stage_id: string | null;
  tenant_id: string | null;
  source_id: string | null;
  assigned_vacancy_location_id: string | null;
  outcome: string;
  applied_at: Date | string;
  created_by_id: string | null;
}

interface StageHistoryDbRow {
  id: string;
  tenant_id: string | null;
  application_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  moved_by_id: string | null;
  moved_at: Date | string;
  notes: string | null;
}

/**
 * Authoritative migration mapping for AMA prototype data:
 * Legacy JobPosting "Enfermera General" (32240aff-a254-4019-8863-7cb90784d449)
 * -> Canonical Vacancy "Enfermera General" (255b4499-7552-4bc5-b395-c6cdc7bc108a)
 */
export const AUTHORIZED_APPLICATION_MAPPINGS: ApplicationBackfillConfig = {
  jobPostingToVacancyMap: {
    "32240aff-a254-4019-8863-7cb90784d449": "255b4499-7552-4bc5-b395-c6cdc7bc108a",
  },
};

/**
 * Helper to validate assignedVacancyLocationId against target Tenant and Vacancy.
 * Required for future T03 compound FK: [tenantId, vacancyId, assignedVacancyLocationId] -> VacancyLocation[tenantId, vacancyId, id]
 */
async function validateAssignedVacancyLocation(
  client: Client,
  applicationId: string,
  assignedVacancyLocationId: string,
  expectedTenantId: string,
  expectedVacancyId: string
): Promise<{ valid: true } | { valid: false; reason: string }> {
  const locRes = await client.query(
    `SELECT id, tenant_id, vacancy_id FROM vacancy_locations WHERE id = $1;`,
    [assignedVacancyLocationId]
  );
  if (locRes.rows.length === 0) {
    return {
      valid: false,
      reason: `FAIL-CLOSED: Application ${applicationId} assignedVacancyLocationId ${assignedVacancyLocationId} not found in database.`,
    };
  }
  const loc = locRes.rows[0];
  if (loc.tenant_id !== expectedTenantId) {
    return {
      valid: false,
      reason: `FAIL-CLOSED: Application ${applicationId} assignedVacancyLocation ${assignedVacancyLocationId} tenant (${loc.tenant_id}) does not match expected tenant (${expectedTenantId}).`,
    };
  }
  if (loc.vacancy_id !== expectedVacancyId) {
    return {
      valid: false,
      reason: `FAIL-CLOSED: Application ${applicationId} assignedVacancyLocation ${assignedVacancyLocationId} vacancy (${loc.vacancy_id}) does not match expected Vacancy (${expectedVacancyId}).`,
    };
  }
  return { valid: true };
}

/**
 * I6-S6-T02 Controlled Application Backfill Engine
 *
 * Implements transaction-safe, deterministic, idempotent backfill
 * for Application and ApplicationStageHistory data.
 */
export async function runApplicationBackfill(
  config?: ApplicationBackfillConfig,
  clientInstance?: Client
): Promise<ApplicationBackfillResult> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && !clientInstance) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = clientInstance ?? new Client({ connectionString: dbUrl });
  const shouldDisconnect = !clientInstance;

  if (shouldDisconnect) {
    await client.connect();
  }

  let transactionStarted = false;

  try {
    console.log("=== I6-S6-T02: APPLICATION BACKFILL & INSPECTION ===");

    // 1. Fetch Applications to inspect
    const appsQuery =
      config?.applicationIds && config.applicationIds.length > 0
        ? `
          SELECT
            id,
            candidate_id,
            job_posting_id,
            vacancy_id,
            stage_id,
            current_stage_id,
            tenant_id,
            source_id,
            assigned_vacancy_location_id,
            outcome,
            applied_at,
            created_by_id
          FROM applications
          WHERE id = ANY($1::uuid[])
          ORDER BY applied_at ASC;
        `
        : `
          SELECT
            id,
            candidate_id,
            job_posting_id,
            vacancy_id,
            stage_id,
            current_stage_id,
            tenant_id,
            source_id,
            assigned_vacancy_location_id,
            outcome,
            applied_at,
            created_by_id
          FROM applications
          ORDER BY applied_at ASC;
        `;

    const appsRes = config?.applicationIds && config.applicationIds.length > 0
      ? await client.query(appsQuery, [config.applicationIds])
      : await client.query(appsQuery);

    const applications: ApplicationDbRow[] = appsRes.rows;
    console.log(`Found ${applications.length} Application row(s) to inspect.`);

    // 2. Fetch StageHistory
    const histQuery =
      config?.applicationIds && config.applicationIds.length > 0
        ? `
          SELECT
            id,
            tenant_id,
            application_id,
            from_stage_id,
            to_stage_id,
            moved_by_id,
            moved_at,
            notes
          FROM application_stage_history
          WHERE application_id = ANY($1::uuid[])
          ORDER BY moved_at ASC;
        `
        : `
          SELECT
            id,
            tenant_id,
            application_id,
            from_stage_id,
            to_stage_id,
            moved_by_id,
            moved_at,
            notes
          FROM application_stage_history
          ORDER BY moved_at ASC;
        `;

    const histRes = config?.applicationIds && config.applicationIds.length > 0
      ? await client.query(histQuery, [config.applicationIds])
      : await client.query(histQuery);

    const stageHistories: StageHistoryDbRow[] = histRes.rows;
    console.log(`Found ${stageHistories.length} ApplicationStageHistory row(s) to inspect.`);

    // Plans to execute
    const applicationUpdatePlans: Array<{
      id: string;
      tenantId: string;
      vacancyId: string;
      currentStageId: string;
    }> = [];

    // Map of application id to final canonical tenantId
    const applicationCanonicalTenantMap = new Map<string, string>();

    let skippedCount = 0;

    // 3. Inspect each Application
    for (const app of applications) {
      console.log(`\nInspecting Application: ${app.id}`);

      // Verify Candidate existence
      const candRes = await client.query(
        `SELECT id, tenant_id FROM candidates WHERE id = $1;`,
        [app.candidate_id]
      );
      if (candRes.rows.length === 0) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount: 0,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} references non-existent Candidate ${app.candidate_id}.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }
      const candidateTenantId: string = candRes.rows[0].tenant_id;

      // Check if already canonical (Case A)
      const isCanonical =
        app.tenant_id !== null &&
        app.vacancy_id !== null &&
        app.current_stage_id !== null;

      if (isCanonical) {
        console.log(`  Application ${app.id} has all canonical fields present.`);

        // Verify consistency
        if (app.tenant_id !== candidateTenantId) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Application ${app.id} tenantId (${app.tenant_id}) does not match Candidate tenantId (${candidateTenantId}).`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }

        const vacRes = await client.query(
          `SELECT id, tenant_id, pipeline_version_id FROM vacancies WHERE id = $1;`,
          [app.vacancy_id]
        );
        if (vacRes.rows.length === 0) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Application ${app.id} references non-existent Vacancy ${app.vacancy_id}.`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }
        const vacancy = vacRes.rows[0];
        if (vacancy.tenant_id !== app.tenant_id) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Vacancy ${app.vacancy_id} tenant (${vacancy.tenant_id}) does not match Application tenant (${app.tenant_id}).`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }

        // Verify currentStage belongs to vacancy.pipelineVersionId
        const stageRes = await client.query(
          `SELECT id, pipeline_version_id FROM pipeline_stages WHERE id = $1;`,
          [app.current_stage_id]
        );
        if (stageRes.rows.length === 0) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Application ${app.id} currentStage ${app.current_stage_id} not found.`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }
        if (stageRes.rows[0].pipeline_version_id !== vacancy.pipeline_version_id) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Application ${app.id} currentStage does not belong to Vacancy's pipeline version.`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }

        // 4. Legacy stage consistency check
        if (app.stage_id !== null && app.stage_id !== app.current_stage_id) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: Canonical Application ${app.id} current_stage_id (${app.current_stage_id}) conflicts with legacy stage_id (${app.stage_id}).`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }

        // 5. Legacy jobPostingId consistency check
        if (app.job_posting_id !== null) {
          const jpRes = await client.query(
            `SELECT id, title FROM job_postings WHERE id = $1;`,
            [app.job_posting_id]
          );
          if (jpRes.rows.length === 0) {
            return {
              status: "BLOCKED",
              inspectedCount: applications.length,
              migratedCount: 0,
              skippedCount,
              blockedCount: 1,
              blockedReason: `FAIL-CLOSED: Application ${app.id} references non-existent JobPosting ${app.job_posting_id}.`,
              stageHistoryInspectedCount: stageHistories.length,
              stageHistoryMigratedCount: 0,
              stageHistorySkippedCount: 0,
              activeDuplicateGroupsCount: 0,
              terminalDuplicateGroupsCount: 0,
            };
          }
          const jobPosting = jpRes.rows[0];
          const mappedVacancyId =
            config?.jobPostingToVacancyMap?.[jobPosting.id] ??
            AUTHORIZED_APPLICATION_MAPPINGS.jobPostingToVacancyMap?.[jobPosting.id];

          if (!mappedVacancyId) {
            return {
              status: "BLOCKED",
              inspectedCount: applications.length,
              migratedCount: 0,
              skippedCount,
              blockedCount: 1,
              blockedReason: `FAIL-CLOSED: No authoritative Vacancy mapping exists for legacy JobPosting "${jobPosting.title}" (${jobPosting.id}) on canonical Application ${app.id}.`,
              stageHistoryInspectedCount: stageHistories.length,
              stageHistoryMigratedCount: 0,
              stageHistorySkippedCount: 0,
              activeDuplicateGroupsCount: 0,
              terminalDuplicateGroupsCount: 0,
            };
          }

          if (mappedVacancyId !== app.vacancy_id) {
            return {
              status: "BLOCKED",
              inspectedCount: applications.length,
              migratedCount: 0,
              skippedCount,
              blockedCount: 1,
              blockedReason: `FAIL-CLOSED: Canonical Application ${app.id} vacancy_id (${app.vacancy_id}) conflicts with authorized Vacancy mapping (${mappedVacancyId}) for JobPosting ${jobPosting.id}.`,
              stageHistoryInspectedCount: stageHistories.length,
              stageHistoryMigratedCount: 0,
              stageHistorySkippedCount: 0,
              activeDuplicateGroupsCount: 0,
              terminalDuplicateGroupsCount: 0,
            };
          }
        }

        // 6. Validate assignedVacancyLocationId if present
        if (app.assigned_vacancy_location_id !== null) {
          const locValidation = await validateAssignedVacancyLocation(
            client,
            app.id,
            app.assigned_vacancy_location_id,
            app.tenant_id!,
            app.vacancy_id!
          );
          if (!locValidation.valid) {
            return {
              status: "BLOCKED",
              inspectedCount: applications.length,
              migratedCount: 0,
              skippedCount,
              blockedCount: 1,
              blockedReason: locValidation.reason,
              stageHistoryInspectedCount: stageHistories.length,
              stageHistoryMigratedCount: 0,
              stageHistorySkippedCount: 0,
              activeDuplicateGroupsCount: 0,
              terminalDuplicateGroupsCount: 0,
            };
          }
        }

        // Already canonical and valid
        applicationCanonicalTenantMap.set(app.id, app.tenant_id);
        skippedCount++;
        continue;
      }

      // Case B: Deterministic legacy mapping needed
      if (!app.job_posting_id) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} lacks both canonical fields and legacy job_posting_id.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      // 1. Fetch JobPosting
      const jpRes = await client.query(
        `SELECT id, title, department_id, pipeline_id FROM job_postings WHERE id = $1;`,
        [app.job_posting_id]
      );
      if (jpRes.rows.length === 0) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Legacy JobPosting ${app.job_posting_id} for Application ${app.id} not found.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }
      const jobPosting = jpRes.rows[0];

      // 2. Resolve target Vacancy
      const explicitVacancyId =
        config?.jobPostingToVacancyMap?.[jobPosting.id] ??
        AUTHORIZED_APPLICATION_MAPPINGS.jobPostingToVacancyMap?.[jobPosting.id];

      if (!explicitVacancyId) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: No authoritative Vacancy mapping exists for legacy JobPosting "${jobPosting.title}" (${jobPosting.id}).`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      const vacRes = await client.query(
        `SELECT id, tenant_id, pipeline_version_id FROM vacancies WHERE id = $1;`,
        [explicitVacancyId]
      );
      if (vacRes.rows.length === 0) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Explicitly mapped Vacancy ${explicitVacancyId} not found in database.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }
      const targetVacancy: {
        id: string;
        tenant_id: string;
        pipeline_version_id: string;
      } = vacRes.rows[0];

      // Check conflict if application already had a different vacancy_id
      if (app.vacancy_id !== null && app.vacancy_id !== targetVacancy.id) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} already has conflicting vacancy_id (${app.vacancy_id} vs computed ${targetVacancy.id}).`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      // 3. Tenant cross-check: Candidate.tenantId == Vacancy.tenantId
      const targetTenantId = targetVacancy.tenant_id;
      if (candidateTenantId !== targetTenantId) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Candidate tenant (${candidateTenantId}) does not match Vacancy tenant (${targetTenantId}) for Application ${app.id}.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      if (app.tenant_id !== null && app.tenant_id !== targetTenantId) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} already has conflicting tenant_id (${app.tenant_id} vs computed ${targetTenantId}).`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      // 4. currentStageId resolution: from stage_id
      if (app.stage_id && app.current_stage_id !== null && app.current_stage_id !== app.stage_id) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} already has conflicting current_stage_id (${app.current_stage_id} vs computed legacy ${app.stage_id}).`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      const sourceStageId = app.stage_id ?? app.current_stage_id;
      if (!sourceStageId) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} has no stageId or currentStageId to resolve process state.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      const stageRes = await client.query(
        `SELECT id, pipeline_version_id, name FROM pipeline_stages WHERE id = $1;`,
        [sourceStageId]
      );
      if (stageRes.rows.length === 0) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Stage ${sourceStageId} referenced by Application ${app.id} not found.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }
      const stage = stageRes.rows[0];
      if (stage.pipeline_version_id !== targetVacancy.pipeline_version_id) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Stage "${stage.name}" (${stage.id}) belongs to pipeline_version ${stage.pipeline_version_id}, but Vacancy belongs to ${targetVacancy.pipeline_version_id}.`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      // Check conflict if application already had a different current_stage_id
      if (app.current_stage_id !== null && app.current_stage_id !== stage.id) {
        return {
          status: "BLOCKED",
          inspectedCount: applications.length,
          migratedCount: 0,
          skippedCount,
          blockedCount: 1,
          blockedReason: `FAIL-CLOSED: Application ${app.id} already has conflicting current_stage_id (${app.current_stage_id} vs computed ${stage.id}).`,
          stageHistoryInspectedCount: stageHistories.length,
          stageHistoryMigratedCount: 0,
          stageHistorySkippedCount: 0,
          activeDuplicateGroupsCount: 0,
          terminalDuplicateGroupsCount: 0,
        };
      }

      // 5. Validate assignedVacancyLocationId for legacy Application if present
      if (app.assigned_vacancy_location_id !== null) {
        const locValidation = await validateAssignedVacancyLocation(
          client,
          app.id,
          app.assigned_vacancy_location_id,
          targetTenantId,
          targetVacancy.id
        );
        if (!locValidation.valid) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: locValidation.reason,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }
      }

      applicationUpdatePlans.push({
        id: app.id,
        tenantId: targetTenantId,
        vacancyId: targetVacancy.id,
        currentStageId: stage.id,
      });

      applicationCanonicalTenantMap.set(app.id, targetTenantId);
    }

    // 4. Duplicate Groups Audit (accounting for planned updates)
    // We check both active duplicates (outcome = NONE) and terminal duplicates
    const simulatedApplications: Array<{
      id: string;
      tenantId: string;
      candidateId: string;
      vacancyId: string;
      outcome: string;
    }> = [];

    for (const app of applications) {
      const plan = applicationUpdatePlans.find((p) => p.id === app.id);
      const tenantId = plan ? plan.tenantId : app.tenant_id;
      const vacancyId = plan ? plan.vacancyId : app.vacancy_id;

      if (tenantId && vacancyId) {
        simulatedApplications.push({
          id: app.id,
          tenantId,
          candidateId: app.candidate_id,
          vacancyId,
          outcome: app.outcome,
        });
      }
    }

    // Check active duplicates: tenantId + candidateId + vacancyId with outcome = 'NONE'
    const activeGroupCounts = new Map<string, number>();
    const terminalGroupCounts = new Map<string, number>();

    for (const app of simulatedApplications) {
      const key = `${app.tenantId}::${app.candidateId}::${app.vacancyId}`;
      if (app.outcome === "NONE") {
        activeGroupCounts.set(key, (activeGroupCounts.get(key) ?? 0) + 1);
      } else {
        terminalGroupCounts.set(key, (terminalGroupCounts.get(key) ?? 0) + 1);
      }
    }

    let activeDuplicateGroupsCount = 0;
    for (const count of activeGroupCounts.values()) {
      if (count > 1) {
        activeDuplicateGroupsCount++;
      }
    }

    let terminalDuplicateGroupsCount = 0;
    for (const count of terminalGroupCounts.values()) {
      if (count > 1) {
        terminalDuplicateGroupsCount++;
      }
    }

    if (activeDuplicateGroupsCount > 0) {
      return {
        status: "BLOCKED",
        inspectedCount: applications.length,
        migratedCount: 0,
        skippedCount,
        blockedCount: activeDuplicateGroupsCount,
        blockedReason: `I6-S6-T02 BLOCKED — ACTIVE APPLICATION DUPLICATES REQUIRE DECISION (${activeDuplicateGroupsCount} active duplicate group(s) detected).`,
        stageHistoryInspectedCount: stageHistories.length,
        stageHistoryMigratedCount: 0,
        stageHistorySkippedCount: 0,
        activeDuplicateGroupsCount,
        terminalDuplicateGroupsCount,
      };
    }

    // 5. Inspect ApplicationStageHistory
    const stageHistoryUpdatePlans: Array<{
      id: string;
      tenantId: string;
    }> = [];

    let stageHistorySkippedCount = 0;

    for (const hist of stageHistories) {
      const parentTenant = applicationCanonicalTenantMap.get(hist.application_id);
      if (!parentTenant) {
        // Parent application wasn't in our inspected set or lacks tenant
        const parentAppRes = await client.query(
          `SELECT tenant_id FROM applications WHERE id = $1;`,
          [hist.application_id]
        );
        if (parentAppRes.rows.length === 0 || !parentAppRes.rows[0].tenant_id) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: ApplicationStageHistory ${hist.id} references parent Application ${hist.application_id} with unresolved tenant.`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }
        const resolvedTenant: string = parentAppRes.rows[0].tenant_id;
        applicationCanonicalTenantMap.set(hist.application_id, resolvedTenant);
      }

      const expectedTenant = applicationCanonicalTenantMap.get(hist.application_id)!;

      if (hist.tenant_id !== null) {
        if (hist.tenant_id !== expectedTenant) {
          return {
            status: "BLOCKED",
            inspectedCount: applications.length,
            migratedCount: 0,
            skippedCount,
            blockedCount: 1,
            blockedReason: `FAIL-CLOSED: ApplicationStageHistory ${hist.id} tenant (${hist.tenant_id}) does not match parent Application tenant (${expectedTenant}).`,
            stageHistoryInspectedCount: stageHistories.length,
            stageHistoryMigratedCount: 0,
            stageHistorySkippedCount: 0,
            activeDuplicateGroupsCount: 0,
            terminalDuplicateGroupsCount: 0,
          };
        }
        stageHistorySkippedCount++;
      } else {
        stageHistoryUpdatePlans.push({
          id: hist.id,
          tenantId: expectedTenant,
        });
      }
    }

    // 6. Transactional Execution
    if (applicationUpdatePlans.length > 0 || stageHistoryUpdatePlans.length > 0) {
      console.log(
        `\nBeginning transaction to migrate ${applicationUpdatePlans.length} Application(s) and ${stageHistoryUpdatePlans.length} StageHistory row(s)...`
      );

      await client.query("BEGIN;");
      transactionStarted = true;

      for (const plan of applicationUpdatePlans) {
        await client.query(
          `
          UPDATE applications
          SET
            tenant_id = $1::uuid,
            vacancy_id = $2::uuid,
            current_stage_id = $3::uuid,
            updated_at = NOW()
          WHERE id = $4::uuid;
        `,
          [plan.tenantId, plan.vacancyId, plan.currentStageId, plan.id]
        );
      }

      for (const plan of stageHistoryUpdatePlans) {
        await client.query(
          `
          UPDATE application_stage_history
          SET tenant_id = $1::uuid
          WHERE id = $2::uuid;
        `,
          [plan.tenantId, plan.id]
        );
      }

      if (config?.simulateFailureAfterUpdate) {
        throw new Error("Simulated failure after update for rollback testing");
      }

      await client.query("COMMIT;");
      transactionStarted = false;
      console.log("Transaction committed successfully.");
    } else {
      console.log("No rows required backfill migration. Zero mutations performed.");
    }

    // 7. Compute Readiness Report
    const readinessReport = await computeT03Readiness(client, config?.applicationIds);

    return {
      status: "SUCCESS",
      inspectedCount: applications.length,
      migratedCount: applicationUpdatePlans.length,
      skippedCount,
      blockedCount: 0,
      stageHistoryInspectedCount: stageHistories.length,
      stageHistoryMigratedCount: stageHistoryUpdatePlans.length,
      stageHistorySkippedCount,
      activeDuplicateGroupsCount,
      terminalDuplicateGroupsCount,
      readinessReport,
    };
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK;");
        console.log("Transaction rolled back.");
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr);
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
 * Computes exact T03 Readiness Metrics directly from PostgreSQL.
 * Uses parameterized queries for scopedApplicationIds to ensure safety and isolation.
 */
export async function computeT03Readiness(
  client: Client,
  scopedApplicationIds?: string[]
): Promise<ApplicationReadinessReport> {
  const isScoped = !!(scopedApplicationIds && scopedApplicationIds.length > 0);
  const params: unknown[] = isScoped ? [scopedApplicationIds] : [];

  const totalAppsRes = await client.query(
    isScoped
      ? `SELECT COUNT(*)::int AS count FROM applications WHERE id = ANY($1::uuid[]);`
      : `SELECT COUNT(*)::int AS count FROM applications;`,
    params
  );
  const totalApplications: number = totalAppsRes.rows[0].count;

  const tenantNullRes = await client.query(
    isScoped
      ? `SELECT COUNT(*)::int AS count FROM applications WHERE tenant_id IS NULL AND id = ANY($1::uuid[]);`
      : `SELECT COUNT(*)::int AS count FROM applications WHERE tenant_id IS NULL;`,
    params
  );
  const tenantIdNullCount: number = tenantNullRes.rows[0].count;

  const vacancyNullRes = await client.query(
    isScoped
      ? `SELECT COUNT(*)::int AS count FROM applications WHERE vacancy_id IS NULL AND id = ANY($1::uuid[]);`
      : `SELECT COUNT(*)::int AS count FROM applications WHERE vacancy_id IS NULL;`,
    params
  );
  const vacancyIdNullCount: number = vacancyNullRes.rows[0].count;

  const currentStageNullRes = await client.query(
    isScoped
      ? `SELECT COUNT(*)::int AS count FROM applications WHERE current_stage_id IS NULL AND id = ANY($1::uuid[]);`
      : `SELECT COUNT(*)::int AS count FROM applications WHERE current_stage_id IS NULL;`,
    params
  );
  const currentStageIdNullCount: number = currentStageNullRes.rows[0].count;

  // Candidate tenant mismatch
  const candMismatchRes = await client.query(
    isScoped
      ? `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE a.tenant_id IS NOT NULL AND c.tenant_id != a.tenant_id AND a.id = ANY($1::uuid[]);
      `
      : `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE a.tenant_id IS NOT NULL AND c.tenant_id != a.tenant_id;
      `,
    params
  );
  const candidateTenantMismatchCount: number = candMismatchRes.rows[0].count;

  // Vacancy tenant mismatch
  const vacMismatchRes = await client.query(
    isScoped
      ? `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        WHERE a.tenant_id IS NOT NULL AND v.tenant_id != a.tenant_id AND a.id = ANY($1::uuid[]);
      `
      : `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        WHERE a.tenant_id IS NOT NULL AND v.tenant_id != a.tenant_id;
      `,
    params
  );
  const vacancyTenantMismatchCount: number = vacMismatchRes.rows[0].count;

  // Stage outside Vacancy.pipelineVersionId
  const stageMismatchRes = await client.query(
    isScoped
      ? `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        JOIN pipeline_stages s ON a.current_stage_id = s.id
        WHERE a.current_stage_id IS NOT NULL
          AND a.vacancy_id IS NOT NULL
          AND s.pipeline_version_id != v.pipeline_version_id
          AND a.id = ANY($1::uuid[]);
      `
      : `
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        JOIN pipeline_stages s ON a.current_stage_id = s.id
        WHERE a.current_stage_id IS NOT NULL
          AND a.vacancy_id IS NOT NULL
          AND s.pipeline_version_id != v.pipeline_version_id;
      `,
    params
  );
  const stageOutsidePipelineVersionCount: number = stageMismatchRes.rows[0].count;

  // assignedVacancyLocationMismatchCount
  const locMismatchRes = await client.query(
    isScoped
      ? `
        SELECT COUNT(*)::int AS count
        FROM applications a
        LEFT JOIN vacancy_locations vl ON a.assigned_vacancy_location_id = vl.id
        WHERE a.assigned_vacancy_location_id IS NOT NULL
          AND (
            vl.id IS NULL
            OR a.tenant_id IS NULL
            OR vl.tenant_id != a.tenant_id
            OR a.vacancy_id IS NULL
            OR vl.vacancy_id != a.vacancy_id
          )
          AND a.id = ANY($1::uuid[]);
      `
      : `
        SELECT COUNT(*)::int AS count
        FROM applications a
        LEFT JOIN vacancy_locations vl ON a.assigned_vacancy_location_id = vl.id
        WHERE a.assigned_vacancy_location_id IS NOT NULL
          AND (
            vl.id IS NULL
            OR a.tenant_id IS NULL
            OR vl.tenant_id != a.tenant_id
            OR a.vacancy_id IS NULL
            OR vl.vacancy_id != a.vacancy_id
          );
      `,
    params
  );
  const assignedVacancyLocationMismatchCount: number = locMismatchRes.rows[0].count;

  // StageHistory tenant null count (scoped to applications if scoped)
  const histTenantNullRes = await client.query(
    isScoped
      ? `
        SELECT COUNT(*)::int AS count
        FROM application_stage_history
        WHERE tenant_id IS NULL AND application_id = ANY($1::uuid[]);
      `
      : `
        SELECT COUNT(*)::int AS count
        FROM application_stage_history
        WHERE tenant_id IS NULL;
      `,
    params
  );
  const stageHistoryTenantNullCount: number = histTenantNullRes.rows[0].count;

  // Active duplicate groups
  const activeDupRes = await client.query(
    isScoped
      ? `
        SELECT tenant_id, candidate_id, vacancy_id, COUNT(*)::int AS cnt
        FROM applications
        WHERE outcome = 'NONE' AND tenant_id IS NOT NULL AND vacancy_id IS NOT NULL
          AND id = ANY($1::uuid[])
        GROUP BY tenant_id, candidate_id, vacancy_id
        HAVING COUNT(*) > 1;
      `
      : `
        SELECT tenant_id, candidate_id, vacancy_id, COUNT(*)::int AS cnt
        FROM applications
        WHERE outcome = 'NONE' AND tenant_id IS NOT NULL AND vacancy_id IS NOT NULL
        GROUP BY tenant_id, candidate_id, vacancy_id
        HAVING COUNT(*) > 1;
      `,
    params
  );
  const activeDuplicateGroupsCount: number = activeDupRes.rows.length;

  // Terminal duplicate groups
  const termDupRes = await client.query(
    isScoped
      ? `
        SELECT tenant_id, candidate_id, vacancy_id, COUNT(*)::int AS cnt
        FROM applications
        WHERE outcome != 'NONE' AND tenant_id IS NOT NULL AND vacancy_id IS NOT NULL
          AND id = ANY($1::uuid[])
        GROUP BY tenant_id, candidate_id, vacancy_id
        HAVING COUNT(*) > 1;
      `
      : `
        SELECT tenant_id, candidate_id, vacancy_id, COUNT(*)::int AS cnt
        FROM applications
        WHERE outcome != 'NONE' AND tenant_id IS NOT NULL AND vacancy_id IS NOT NULL
        GROUP BY tenant_id, candidate_id, vacancy_id
        HAVING COUNT(*) > 1;
      `,
    params
  );
  const terminalDuplicateGroupsCount: number = termDupRes.rows.length;

  const isT03Ready =
    tenantIdNullCount === 0 &&
    vacancyIdNullCount === 0 &&
    currentStageIdNullCount === 0 &&
    candidateTenantMismatchCount === 0 &&
    vacancyTenantMismatchCount === 0 &&
    stageOutsidePipelineVersionCount === 0 &&
    assignedVacancyLocationMismatchCount === 0 &&
    stageHistoryTenantNullCount === 0 &&
    activeDuplicateGroupsCount === 0;

  return {
    totalApplications,
    tenantIdNullCount,
    vacancyIdNullCount,
    currentStageIdNullCount,
    candidateTenantMismatchCount,
    vacancyTenantMismatchCount,
    stageOutsidePipelineVersionCount,
    assignedVacancyLocationMismatchCount,
    stageHistoryTenantNullCount,
    activeDuplicateGroupsCount,
    terminalDuplicateGroupsCount,
    isT03Ready,
  };
}

// CLI Execution Entry Point
if (require.main === module) {
  runApplicationBackfill(AUTHORIZED_APPLICATION_MAPPINGS)
    .then((result) => {
      console.log("\nApplication Backfill Result:\n", JSON.stringify(result, null, 2));
      if (result.status === "BLOCKED") {
        process.exit(2);
      }
    })
    .catch((err) => {
      console.error("\nApplication Backfill Execution Failed:\n", err);
      process.exit(1);
    });
}
