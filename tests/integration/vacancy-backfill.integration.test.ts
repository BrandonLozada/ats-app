import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import { prisma } from "@/infrastructure/database/prisma.client";
import { runVacancyBackfill, AUTHORIZED_LEGACY_MAPPINGS } from "@/../scripts/backfill-vacancies";

describe("Vacancy Backfill Integration Tests (Real PostgreSQL)", () => {
  const tenantTestId = "92000000-0000-4000-d000-000000000001";
  const orgTestId = "92000000-0000-4000-d000-000000000002";
  const categoryTestId = "92000000-0000-4000-d000-000000000003";

  const legalEntity1Id = "92000000-0000-4000-d000-000000000011";
  const legalEntity2Id = "92000000-0000-4000-d000-000000000012";

  const location1Id = "92000000-0000-4000-d000-000000000021";
  const location2Id = "92000000-0000-4000-d000-000000000022";

  const departmentTestId = "92000000-0000-4000-d000-000000000031";

  const pipeTestId = "92000000-0000-4000-d000-000000000041";
  const verTestId = "92000000-0000-4000-d000-000000000051";

  const jobPostingTestId = "92000000-0000-4000-d000-000000000061";
  const jobPostingSlug = "test-medico-general";

  const foreignTenantId = "92000000-0000-4000-d000-000000000099";
  const foreignDeptId = "92000000-0000-4000-d000-000000000098";
  const foreignJobId = "92000000-0000-4000-d000-000000000097";

  const jobRollback1Id = "92000000-0000-4000-d000-000000000071";
  const jobRollback1Slug = "test-rollback-job-1";
  const jobRollback2Id = "92000000-0000-4000-d000-000000000072";
  const jobRollback2Slug = "test-rollback-job-2";

  const nullPubJobId = "92000000-0000-4000-d000-000000000073";
  const nullPubJobSlug = "test-null-published-at";

  const invalidJobId = "92000000-0000-4000-d000-000000000081";
  const invalidLegacyJobId = "92000000-0000-4000-d000-000000000082";

  const ver2TestId = "92000000-0000-4000-d000-000000000052";
  const verDraftTestId = "92000000-0000-4000-d000-000000000053";
  const foreignPipeId = "92000000-0000-4000-d000-000000000042";
  const foreignPipeVerId = "92000000-0000-4000-d000-000000000054";

  const jobMultiVerId = "92000000-0000-4000-d000-000000000074";
  const jobMultiVerSlug = "test-multi-ver-job";
  const jobInvalidVerId = "92000000-0000-4000-d000-000000000075";
  const jobInvalidVerSlug = "test-invalid-ver-job";

  async function cleanup() {
    await prisma.vacancyLocation.deleteMany({
      where: { tenantId: { in: [tenantTestId, foreignTenantId] } },
    });
    await prisma.vacancy.deleteMany({
      where: { tenantId: { in: [tenantTestId, foreignTenantId] } },
    });
    await prisma.jobPosting.deleteMany({
      where: {
        id: {
          in: [
            jobPostingTestId,
            foreignJobId,
            jobRollback1Id,
            jobRollback2Id,
            nullPubJobId,
            invalidJobId,
            invalidLegacyJobId,
            jobMultiVerId,
            jobInvalidVerId,
          ],
        },
      },
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipelineVersionId: { in: [verTestId, ver2TestId, verDraftTestId, foreignPipeVerId] } },
    });
    await prisma.pipelineVersion.deleteMany({
      where: { id: { in: [verTestId, ver2TestId, verDraftTestId, foreignPipeVerId] } },
    });
    await prisma.hiringPipeline.deleteMany({
      where: { id: { in: [pipeTestId, foreignPipeId] } },
    });
    await prisma.location.deleteMany({
      where: { id: { in: [location1Id, location2Id] } },
    });
    await prisma.legalEntity.deleteMany({
      where: { id: { in: [legalEntity1Id, legalEntity2Id] } },
    });
    await prisma.department.deleteMany({
      where: { id: { in: [departmentTestId, foreignDeptId] } },
    });
    await prisma.jobCategory.deleteMany({
      where: { id: categoryTestId },
    });
    await prisma.organization.deleteMany({
      where: { id: orgTestId },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantTestId, foreignTenantId] } },
    });
  }

  beforeAll(async () => {
    await cleanup();

    // 1. Tenant
    await prisma.tenant.create({
      data: {
        id: tenantTestId,
        slug: "tenant-backfill-test",
        name: "Tenant Backfill Test",
      },
    });

    // 2. Organization (legacy)
    await prisma.organization.create({
      data: {
        id: orgTestId,
        name: "Test Org",
      },
    });

    // 3. Category
    await prisma.jobCategory.create({
      data: {
        id: categoryTestId,
        name: "Medicina",
        slug: "medicina-backfill-test",
      },
    });

    // 4. LegalEntities (2 candidates to test ambiguity)
    await prisma.legalEntity.createMany({
      data: [
        { id: legalEntity1Id, tenantId: tenantTestId, name: "LE Test 1", code: "LET1" },
        { id: legalEntity2Id, tenantId: tenantTestId, name: "LE Test 2", code: "LET2" },
      ],
    });

    // 5. Locations
    await prisma.location.createMany({
      data: [
        { id: location1Id, tenantId: tenantTestId, legalEntityId: legalEntity1Id, name: "Loc Test 1" },
        { id: location2Id, tenantId: tenantTestId, legalEntityId: legalEntity2Id, name: "Loc Test 2" },
      ],
    });

    // 6. Department
    await prisma.department.create({
      data: {
        id: departmentTestId,
        tenantId: tenantTestId,
        name: "Medicina General",
        slug: "medicina-general-test",
      },
    });

    // 7. Pipeline & PUBLISHED Version 1
    await prisma.hiringPipeline.create({
      data: {
        id: pipeTestId,
        tenantId: tenantTestId,
        name: "Pipeline Test",
        isDefault: true,
      },
    });

    await prisma.pipelineVersion.create({
      data: {
        id: verTestId,
        tenantId: tenantTestId,
        pipelineId: pipeTestId,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        stages: {
          create: [
            { name: "stage_1", category: "APPLIED", order: 1, isInitial: true },
            { name: "stage_2", category: "SCREENING", order: 2, isInitial: false },
            { name: "stage_3", category: "INTERVIEW", order: 3, isInitial: false },
            { name: "stage_4", category: "OFFER", order: 4, isInitial: false },
          ],
        },
      },
    });

    // 8. Legacy JobPosting
    await prisma.jobPosting.create({
      data: {
        id: jobPostingTestId,
        title: "Médico General",
        slug: jobPostingSlug,
        description: "Consulta externa para médicos...",
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        categoryId: categoryTestId,
        departmentId: departmentTestId,
        organizationId: orgTestId,
        pipelineId: pipeTestId,
        isRemote: false,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("fails closed when LegalEntity/Location mapping is ambiguous (multiple candidates under tenant)", async () => {
    // Attempt backfill without explicit mapping config, scoped to this job posting
    const result = await runVacancyBackfill({
      jobPostingIds: [jobPostingTestId],
    });

    // Should return BLOCKED because tenant has 2 LegalEntities and legacy JobPosting has no mapping
    expect(result.status).toBe("BLOCKED");
    expect(result.blockedReason).toContain("BACKFILL BLOCKED — LEGAL ENTITY / LOCATION MAPPING REQUIRED");
    expect(result.unresolvedRows?.length).toBe(1);
    expect(result.unresolvedRows?.[0]?.jobPostingId).toBe(jobPostingTestId);
    expect(result.unresolvedRows?.[0]?.candidateLegalEntities.length).toBe(2);

    // Verify no Vacancy row was created for this test job
    const createdVac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
    });
    expect(createdVac).toBeNull();
  });

  it("successfully backfills JobPosting into Vacancy & VacancyLocation when explicit mapping is provided", async () => {
    // Provide explicit mapping for this jobPosting
    const result = await runVacancyBackfill({
      jobPostingIds: [jobPostingTestId],
      jobPostingMappings: {
        [jobPostingTestId]: {
          legalEntityId: legalEntity1Id,
          locationId: location1Id,
          openings: 1,
        },
      },
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.inspectedCount).toBe(1);
    expect(result.migratedCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    // Verify canonical Vacancy
    const createdVac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
      include: {
        locations: true,
      },
    });

    expect(createdVac).not.toBeNull();
    expect(createdVac?.tenantId).toBe(tenantTestId);
    expect(createdVac?.departmentId).toBe(departmentTestId);
    expect(createdVac?.legalEntityId).toBe(legalEntity1Id);
    expect(createdVac?.pipelineVersionId).toBe(verTestId);
    expect(createdVac?.title).toBe("Médico General");
    expect(createdVac?.slug).toBe(jobPostingSlug);
    expect(createdVac?.status).toBe("PUBLISHED");
    expect(createdVac?.openings).toBe(1);
    expect(createdVac?.publishedAt).not.toBeNull();

    // Verify canonical VacancyLocation
    expect(createdVac?.locations.length).toBe(1);
    const loc = createdVac?.locations[0];
    expect(loc?.tenantId).toBe(tenantTestId);
    expect(loc?.vacancyId).toBe(createdVac?.id);
    expect(loc?.legalEntityId).toBe(legalEntity1Id);
    expect(loc?.locationId).toBe(location1Id);
    expect(loc?.openings).toBe(1);
  });

  it("is idempotent: re-running backfill skips already migrated row without duplication", async () => {
    const result = await runVacancyBackfill({
      jobPostingIds: [jobPostingTestId],
      jobPostingMappings: {
        [jobPostingTestId]: {
          legalEntityId: legalEntity1Id,
          locationId: location1Id,
          openings: 1,
        },
      },
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.inspectedCount).toBe(1);
    expect(result.migratedCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    // Total Vacancy count for this test tenant must remain exactly 1
    const vacancies = await prisma.vacancy.findMany({
      where: { tenantId: tenantTestId },
    });
    expect(vacancies.length).toBe(1);

    // Total VacancyLocation count must remain exactly 1
    const vacLocations = await prisma.vacancyLocation.findMany({
      where: { tenantId: tenantTestId },
    });
    expect(vacLocations.length).toBe(1);
  });

  it("fails closed when legacy Department belongs to a different Tenant", async () => {
    // Create another department under a foreign tenant
    await prisma.tenant.create({
      data: { id: foreignTenantId, name: "Foreign Tenant", slug: "foreign-tenant" },
    });
    await prisma.department.create({
      data: { id: foreignDeptId, tenantId: foreignTenantId, name: "Foreign Dept", slug: "foreign-dept" },
    });
    await prisma.jobPosting.create({
      data: {
        id: foreignJobId,
        title: "Cross-Tenant Job",
        slug: "cross-tenant-job",
        description: "Invalid cross-tenant test",
        employmentType: "FULL_TIME",
        categoryId: categoryTestId,
        departmentId: foreignDeptId,
        organizationId: orgTestId,
        pipelineId: pipeTestId, // pipeline is under tenantTestId, but dept is under foreignTenantId!
      },
    });

    await expect(
      runVacancyBackfill({
        jobPostingIds: [foreignJobId],
        jobPostingMappings: {
          [foreignJobId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(/FAIL-CLOSED: Pipeline tenant/);

    // Clean up temporary cross-tenant fixtures
    await prisma.jobPosting.deleteMany({ where: { id: foreignJobId } });
    await prisma.department.deleteMany({ where: { id: foreignDeptId } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
  });

  it("fails closed when legacy JobPosting has unsupported/unknown status without mutating DB", async () => {
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const originalQuery = client.query.bind(client);
      const fakeJobId = "92000000-0000-4000-d000-000000000079";
      const fakeJobSlug = "unsupported-status-job";

      // Intercept the job_postings select query on this client to return an unsupported status
      client.query = (async (
        queryTextOrConfig: unknown,
        values?: unknown[]
      ) => {
        if (
          typeof queryTextOrConfig === "string" &&
          queryTextOrConfig.includes("FROM job_postings")
        ) {
          return {
            rows: [
              {
                id: fakeJobId,
                title: "Unsupported Status Job",
                slug: fakeJobSlug,
                description: "Test description",
                status: "ARCHIVED", // unsupported status
                employment_type: "FULL_TIME",
                is_remote: false,
                department_id: departmentTestId,
                organization_id: orgTestId,
                pipeline_id: pipeTestId,
                total_positions: 1,
                published_at: null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        return originalQuery(queryTextOrConfig as never, values as never);
      }) as typeof client.query;

      await expect(
        runVacancyBackfill(
          {
            jobPostingIds: [fakeJobId],
            jobPostingMappings: {
              [fakeJobId]: {
                legalEntityId: legalEntity1Id,
                locationId: location1Id,
                openings: 1,
              },
            },
          },
          client
        )
      ).rejects.toThrow(
        /FAIL-CLOSED: Unsupported legacy JobPosting status "ARCHIVED"/
      );

      // Verify no Vacancy was created
      const vac = await prisma.vacancy.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenantTestId,
            slug: fakeJobSlug,
          },
        },
      });
      expect(vac).toBeNull();
    } finally {
      await client.end();
    }
  });

  it("preserves null publishedAt when legacy JobPosting is PUBLISHED with null published_at", async () => {
    await prisma.jobPosting.create({
      data: {
        id: nullPubJobId,
        title: "Médico Sin Fecha",
        slug: nullPubJobSlug,
        description: "Publicado sin fecha histórica...",
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
        publishedAt: null,
        categoryId: categoryTestId,
        departmentId: departmentTestId,
        organizationId: orgTestId,
        pipelineId: pipeTestId,
        isRemote: false,
      },
    });

    const result = await runVacancyBackfill({
      jobPostingIds: [nullPubJobId],
      jobPostingMappings: {
        [nullPubJobId]: {
          legalEntityId: legalEntity1Id,
          locationId: location1Id,
          // openings omitted to verify transitional default = 1
        },
      },
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.migratedCount).toBe(1);

    const createdVac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: nullPubJobSlug,
        },
      },
      include: {
        locations: true,
      },
    });

    expect(createdVac).not.toBeNull();
    expect(createdVac?.status).toBe("PUBLISHED");
    expect(createdVac?.publishedAt).toBeNull(); // Proves NO now() or created_at fallback!
    expect(createdVac?.openings).toBe(1); // Proves transitional default Vacancy.openings = 1
    expect(createdVac?.locations.length).toBe(1);
    expect(createdVac?.locations[0].openings).toBe(1); // Proves VacancyLocation.openings = 1
  });

  it.each([0, -1, -10, 1.5])(
    "fails closed when explicit mapping specifies invalid openings (%s)",
    async (invalidOpenings) => {
      const slug = `invalid-openings-${String(invalidOpenings).replace(".", "_")}`;

      await prisma.jobPosting.create({
        data: {
          id: invalidJobId,
          title: `Invalid Job ${invalidOpenings}`,
          slug,
          description: "Testing invalid openings validation",
          employmentType: "FULL_TIME",
          status: "PUBLISHED",
          categoryId: categoryTestId,
          departmentId: departmentTestId,
          organizationId: orgTestId,
          pipelineId: pipeTestId,
          isRemote: false,
        },
      });

      try {
        await expect(
          runVacancyBackfill({
            jobPostingIds: [invalidJobId],
            jobPostingMappings: {
              [invalidJobId]: {
                legalEntityId: legalEntity1Id,
                locationId: location1Id,
                openings: invalidOpenings,
              },
            },
          })
        ).rejects.toThrow(
          new RegExp(`FAIL-CLOSED: Invalid openings value \\(${invalidOpenings}\\)`)
        );

        // Verify zero mutations occurred: no Vacancy or VacancyLocation created
        const vac = await prisma.vacancy.findUnique({
          where: {
            tenantId_slug: {
              tenantId: tenantTestId,
              slug,
            },
          },
        });
        expect(vac).toBeNull();
      } finally {
        await prisma.jobPosting.deleteMany({ where: { id: invalidJobId } });
      }
    }
  );

  it("fails closed when legacy JobPosting.totalPositions is invalid (0) without explicit override", async () => {
    const slug = "invalid-legacy-total-positions-zero";

    await prisma.jobPosting.create({
      data: {
        id: invalidLegacyJobId,
        title: "Legacy Invalid Positions Job",
        slug,
        description: "Testing invalid legacy totalPositions",
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
        totalPositions: 0, // invalid source headcount in legacy DB
        categoryId: categoryTestId,
        departmentId: departmentTestId,
        organizationId: orgTestId,
        pipelineId: pipeTestId,
        isRemote: false,
      },
    });

    try {
      await expect(
        runVacancyBackfill({
          jobPostingIds: [invalidLegacyJobId],
          jobPostingMappings: {
            [invalidLegacyJobId]: {
              legalEntityId: legalEntity1Id,
              locationId: location1Id,
              // openings omitted: falls back to totalPositions = 0
            },
          },
        })
      ).rejects.toThrow(/FAIL-CLOSED: Invalid openings value \(0\)/);

      // Verify zero mutations occurred
      const vac = await prisma.vacancy.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenantTestId,
            slug,
          },
        },
      });
      expect(vac).toBeNull();
    } finally {
      await prisma.jobPosting.deleteMany({ where: { id: invalidLegacyJobId } });
    }
  });

  it("fails closed when existing Vacancy has conflicting canonical fields (no overwrite)", async () => {
    // Modify existing Vacancy from previous test (test-medico-general) to have conflicting openings
    await prisma.vacancy.update({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
      data: {
        openings: 99, // conflict with JobPosting expected 1
      },
    });

    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobPostingTestId],
        jobPostingMappings: {
          [jobPostingTestId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(
      /FAIL-CLOSED: Conflicting canonical projection found for Vacancy.*openings/
    );

    // Verify DB row was NOT overwritten
    const vac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
    });
    expect(vac?.openings).toBe(99);

    // Restore to 1
    await prisma.vacancy.update({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
      data: {
        openings: 1,
      },
    });
  });

  it("fails closed when existing VacancyLocation has conflicting allocation (no overwrite)", async () => {
    const vac = await prisma.vacancy.findUniqueOrThrow({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobPostingSlug,
        },
      },
    });

    // Update VacancyLocation openings to 2 (conflict with expected 1)
    await prisma.vacancyLocation.update({
      where: {
        vacancyId_locationId: {
          vacancyId: vac.id,
          locationId: location1Id,
        },
      },
      data: {
        openings: 2,
      },
    });

    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobPostingTestId],
        jobPostingMappings: {
          [jobPostingTestId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(
      /FAIL-CLOSED: Conflicting VacancyLocation found.*openings/
    );

    // Verify VacancyLocation was NOT overwritten
    const vl = await prisma.vacancyLocation.findUniqueOrThrow({
      where: {
        vacancyId_locationId: {
          vacancyId: vac.id,
          locationId: location1Id,
        },
      },
    });
    expect(vl.openings).toBe(2);

    // Restore to 1
    await prisma.vacancyLocation.update({
      where: {
        vacancyId_locationId: {
          vacancyId: vac.id,
          locationId: location1Id,
        },
      },
      data: {
        openings: 1,
      },
    });
  });

  it("rolls back transaction and keeps injected Client usable when failure occurs AFTER BEGIN", async () => {
    // 1. Create two JobPostings in DB
    await prisma.jobPosting.createMany({
      data: [
        {
          id: jobRollback1Id,
          title: "Rollback Job 1",
          slug: jobRollback1Slug,
          description: "Will be inserted first inside transaction",
          employmentType: "FULL_TIME",
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-01T00:00:00.000Z"),
          categoryId: categoryTestId,
          departmentId: departmentTestId,
          organizationId: orgTestId,
          pipelineId: pipeTestId,
          isRemote: false,
        },
        {
          id: jobRollback2Id,
          title: "Rollback Job 2",
          slug: jobRollback2Slug,
          description: "Will conflict and trigger failure inside transaction",
          employmentType: "FULL_TIME",
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-01T00:00:00.000Z"),
          categoryId: categoryTestId,
          departmentId: departmentTestId,
          organizationId: orgTestId,
          pipelineId: pipeTestId,
          isRemote: false,
        },
      ],
    });

    // 2. Pre-create a conflicting Vacancy for jobRollback2
    await prisma.vacancy.create({
      data: {
        tenantId: tenantTestId,
        departmentId: departmentTestId,
        legalEntityId: legalEntity1Id,
        pipelineVersionId: verTestId,
        title: "Conflicting Existing Title",
        slug: jobRollback2Slug,
        description: "Conflicting pre-existing description",
        employmentType: "FULL_TIME",
        status: "DRAFT",
        openings: 5,
      },
    });

    // 3. Instantiate and connect an injected PostgreSQL Client
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      // 4. Run backfill with injected client covering both jobs
      await expect(
        runVacancyBackfill(
          {
            jobPostingIds: [jobRollback1Id, jobRollback2Id],
            jobPostingMappings: {
              [jobRollback1Id]: {
                legalEntityId: legalEntity1Id,
                locationId: location1Id,
                openings: 1,
              },
              [jobRollback2Id]: {
                legalEntityId: legalEntity1Id,
                locationId: location1Id,
                openings: 1,
              },
            },
          },
          client
        )
      ).rejects.toThrow(/FAIL-CLOSED: Conflicting canonical projection found for Vacancy/);

      // 5. Verify rollback: Job 1 was inserted inside the transaction before Job 2 failed,
      // but MUST be completely rolled back!
      const vac1 = await prisma.vacancy.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenantTestId,
            slug: jobRollback1Slug,
          },
        },
      });
      expect(vac1).toBeNull();

      // 6. Verify injected Client is NOT closed and is NOT in aborted transaction
      const pingRes = await client.query("SELECT 1 AS alive;");
      expect(pingRes.rows[0].alive).toBe(1);

      // Verify transaction is clean autocommit state (txid_current_if_assigned is null)
      const txRes = await client.query("SELECT txid_current_if_assigned() AS txid;");
      expect(txRes.rows[0].txid).toBeNull();
    } finally {
      await client.end();
    }
  });

  it("defines the exact authorized mapping configuration for legacy JobPosting Enfermera General", () => {
    expect(AUTHORIZED_LEGACY_MAPPINGS.jobPostingIds).toEqual([
      "32240aff-a254-4019-8863-7cb90784d449",
    ]);
    expect(
      AUTHORIZED_LEGACY_MAPPINGS.jobPostingMappings?.[
        "32240aff-a254-4019-8863-7cb90784d449"
      ]
    ).toEqual({
      legalEntityId: "11111111-1111-4111-a111-111111111111",
      locationId: "33333333-3333-4333-a333-333333333333",
      pipelineVersionId: "cacea55a-a043-425a-a54f-0f06c514aa1a",
      openings: 1,
    });
  });

  it("successfully backfills when multiple PUBLISHED versions exist if exact pipelineVersionId is pinned (future-version reproducibility)", async () => {
    // 1. Create a JobPosting referencing pipeTestId
    await prisma.jobPosting.create({
      data: {
        id: jobMultiVerId,
        title: "Multi Version Job",
        slug: jobMultiVerSlug,
        description: "Testing multiple versions",
        status: "PUBLISHED",
        employmentType: "FULL_TIME",
        organizationId: orgTestId,
        departmentId: departmentTestId,
        categoryId: categoryTestId,
        pipelineId: pipeTestId,
        totalPositions: 1,
        isRemote: false,
      },
    });

    // 2. Create a second PUBLISHED PipelineVersion on pipeTestId
    await prisma.pipelineVersion.create({
      data: {
        id: ver2TestId,
        tenantId: tenantTestId,
        pipelineId: pipeTestId,
        version: 2,
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-02T00:00:00.000Z"),
        stages: {
          create: [
            { name: "stage_v2_1", category: "APPLIED", order: 1, isInitial: true },
          ],
        },
      },
    });

    // 3. Verify that without explicit pipelineVersionId, backfill fails closed due to multiple PUBLISHED versions
    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobMultiVerId],
        jobPostingMappings: {
          [jobMultiVerId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            openings: 1,
            // pipelineVersionId omitted!
          },
        },
      })
    ).rejects.toThrow(/FAIL-CLOSED: Multiple PUBLISHED PipelineVersions found/);

    // 4. Verify that WITH explicit pipelineVersionId pinned to v1 (verTestId), backfill succeeds and selects v1
    const result = await runVacancyBackfill({
      jobPostingIds: [jobMultiVerId],
      jobPostingMappings: {
        [jobMultiVerId]: {
          legalEntityId: legalEntity1Id,
          locationId: location1Id,
          pipelineVersionId: verTestId, // Pin v1
          openings: 1,
        },
      },
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.migratedCount).toBe(1);

    // 5. Verify the created Vacancy references exact pinned v1, NOT v2
    const vac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobMultiVerSlug,
        },
      },
    });
    expect(vac).not.toBeNull();
    expect(vac?.pipelineVersionId).toBe(verTestId);
    expect(vac?.pipelineVersionId).not.toBe(ver2TestId);
  });

  it("fails closed when explicit pipelineVersionId is invalid (DRAFT, foreign pipeline, or not found)", async () => {
    // 1. Create JobPosting
    await prisma.jobPosting.create({
      data: {
        id: jobInvalidVerId,
        title: "Invalid Version Job",
        slug: jobInvalidVerSlug,
        description: "Testing invalid version mapping",
        status: "PUBLISHED",
        employmentType: "FULL_TIME",
        organizationId: orgTestId,
        departmentId: departmentTestId,
        categoryId: categoryTestId,
        pipelineId: pipeTestId,
        totalPositions: 1,
        isRemote: false,
      },
    });

    // 2. Create DRAFT version on same pipeline
    await prisma.pipelineVersion.create({
      data: {
        id: verDraftTestId,
        tenantId: tenantTestId,
        pipelineId: pipeTestId,
        version: 3,
        status: "DRAFT",
        stages: {
          create: [
            { name: "stage_v3_1", category: "APPLIED", order: 1, isInitial: true },
          ],
        },
      },
    });

    // 3. Create foreign pipeline and published version on same tenant
    await prisma.hiringPipeline.create({
      data: {
        id: foreignPipeId,
        tenantId: tenantTestId,
        name: "Foreign Pipeline",
        isDefault: false,
      },
    });
    await prisma.pipelineVersion.create({
      data: {
        id: foreignPipeVerId,
        tenantId: tenantTestId,
        pipelineId: foreignPipeId,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        stages: {
          create: [
            { name: "stage_f_1", category: "APPLIED", order: 1, isInitial: true },
          ],
        },
      },
    });

    // Test A: DRAFT explicit version fails closed
    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobInvalidVerId],
        jobPostingMappings: {
          [jobInvalidVerId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            pipelineVersionId: verDraftTestId,
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(/FAIL-CLOSED: Explicit PipelineVersion .* has status "DRAFT"\. Expected "PUBLISHED"\./);

    // Test B: Foreign pipeline version fails closed
    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobInvalidVerId],
        jobPostingMappings: {
          [jobInvalidVerId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            pipelineVersionId: foreignPipeVerId,
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(/FAIL-CLOSED: Explicit PipelineVersion .* pipeline .* does not match JobPosting pipeline/);

    // Test C: Non-existent PipelineVersion ID fails closed
    await expect(
      runVacancyBackfill({
        jobPostingIds: [jobInvalidVerId],
        jobPostingMappings: {
          [jobInvalidVerId]: {
            legalEntityId: legalEntity1Id,
            locationId: location1Id,
            pipelineVersionId: "92000000-0000-4000-d000-000000000099",
            openings: 1,
          },
        },
      })
    ).rejects.toThrow(/FAIL-CLOSED: Explicit PipelineVersion .* not found\./);

    // Verify zero database mutations
    const vac = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenantTestId,
          slug: jobInvalidVerSlug,
        },
      },
    });
    expect(vac).toBeNull();
  });
});

