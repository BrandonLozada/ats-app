import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { ApplicationOutcome } from "@/generated/prisma/client";

describe("I6-S6-T01: Application Schema Foundation Integration Tests (Real PostgreSQL)", () => {
  const testTenantId = "98000000-0000-4000-a000-000000000001";
  const foreignTenantId = "98000000-0000-4000-a000-000000000002";

  const legalEntityId = "98000000-0000-4000-a000-000000000010";
  const locationId = "98000000-0000-4000-a000-000000000011";
  const departmentId = "98000000-0000-4000-a000-000000000012";

  const pipelineId = "98000000-0000-4000-a000-000000000020";
  const pipelineVersionId = "98000000-0000-4000-a000-000000000021";
  const stage1Id = "98000000-0000-4000-a000-000000000022";
  const stage2Id = "98000000-0000-4000-a000-000000000023";

  const vacancyId = "98000000-0000-4000-a000-000000000030";
  const vacancyLocationId = "98000000-0000-4000-a000-000000000031";

  const candidateId = "98000000-0000-4000-a000-000000000040";
  const sourceId = "98000000-0000-4000-a000-000000000050";

  const jobCategoryId = "98000000-0000-4000-a000-000000000060";
  const jobPostingId = "98000000-0000-4000-a000-000000000061";

  const appId1 = "98000000-0000-4000-a000-000000000071";
  const appId2 = "98000000-0000-4000-a000-000000000072";
  const appId3 = "98000000-0000-4000-a000-000000000073";

  async function cleanup() {
    // Delete in reverse dependency order
    await prisma.applicationStageHistory.deleteMany({
      where: {
        OR: [
          { tenantId: { in: [testTenantId, foreignTenantId] } },
          { application: { id: { in: [appId1, appId2, appId3] } } },
        ],
      },
    });

    await prisma.application.deleteMany({
      where: {
        OR: [
          { id: { in: [appId1, appId2, appId3] } },
          { tenantId: { in: [testTenantId, foreignTenantId] } },
          { candidateId },
          { vacancyId },
        ],
      },
    });

    await prisma.vacancyLocation.deleteMany({
      where: { id: vacancyLocationId },
    });

    await prisma.vacancy.deleteMany({
      where: { id: vacancyId },
    });

    await prisma.jobPosting.deleteMany({
      where: { id: jobPostingId },
    });

    await prisma.jobCategory.deleteMany({
      where: { id: jobCategoryId },
    });

    await prisma.candidate.deleteMany({
      where: { id: candidateId },
    });

    await prisma.applicationSource.deleteMany({
      where: { id: sourceId },
    });

    await prisma.pipelineStage.deleteMany({
      where: { id: { in: [stage1Id, stage2Id] } },
    });

    await prisma.pipelineVersion.deleteMany({
      where: { id: pipelineVersionId },
    });

    await prisma.hiringPipeline.deleteMany({
      where: { id: pipelineId },
    });

    await prisma.location.deleteMany({
      where: { id: locationId },
    });

    await prisma.legalEntity.deleteMany({
      where: { id: legalEntityId },
    });

    await prisma.department.deleteMany({
      where: { id: departmentId },
    });

    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantId, foreignTenantId] } },
    });
  }

  beforeAll(async () => {
    await cleanup();

    // 1. Create Tenants
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Test Tenant 98",
        slug: "test-tenant-98",
      },
    });

    await prisma.tenant.create({
      data: {
        id: foreignTenantId,
        name: "Foreign Tenant 98",
        slug: "foreign-tenant-98",
      },
    });

    // 2. Org hierarchy
    await prisma.department.create({
      data: {
        id: departmentId,
        tenantId: testTenantId,
        name: "Dept 98",
        slug: "dept-98",
      },
    });

    await prisma.legalEntity.create({
      data: {
        id: legalEntityId,
        tenantId: testTenantId,
        name: "Legal Entity 98",
        code: "LE98",
      },
    });

    await prisma.location.create({
      data: {
        id: locationId,
        tenantId: testTenantId,
        legalEntityId,
        name: "Location 98",
        code: "LOC98",
      },
    });

    // 3. Pipeline
    await prisma.hiringPipeline.create({
      data: {
        id: pipelineId,
        tenantId: testTenantId,
        name: "Pipeline 98",
        isDefault: true,
      },
    });

    await prisma.pipelineVersion.create({
      data: {
        id: pipelineVersionId,
        tenantId: testTenantId,
        pipelineId,
        version: 1,
        status: "PUBLISHED",
      },
    });

    await prisma.pipelineStage.create({
      data: {
        id: stage1Id,
        pipelineVersionId,
        name: "Applied",
        category: "APPLIED",
        order: 1,
        isInitial: true,
      },
    });

    await prisma.pipelineStage.create({
      data: {
        id: stage2Id,
        pipelineVersionId,
        name: "Screening",
        category: "SCREENING",
        order: 2,
        isInitial: false,
      },
    });

    // 4. Vacancy & VacancyLocation
    await prisma.vacancy.create({
      data: {
        id: vacancyId,
        tenantId: testTenantId,
        departmentId,
        legalEntityId,
        pipelineVersionId,
        title: "Test Vacancy 98",
        slug: "test-vacancy-98",
        status: "PUBLISHED",
        openings: 1,
      },
    });

    await prisma.vacancyLocation.create({
      data: {
        id: vacancyLocationId,
        tenantId: testTenantId,
        vacancyId,
        legalEntityId,
        locationId,
        openings: 1,
      },
    });

    // 5. Candidate
    await prisma.candidate.create({
      data: {
        id: candidateId,
        tenantId: testTenantId,
        firstName: "Jane",
        lastName: "Doe",
        name: "Jane Doe",
        email: "jane.doe98@example.com",
        emailNormalized: "jane.doe98@example.com",
      },
    });

    // 6. ApplicationSource
    await prisma.applicationSource.create({
      data: {
        id: sourceId,
        name: "Career Site 98",
        type: "INTERNAL",
      },
    });

    // 7. Legacy JobCategory & JobPosting
    await prisma.jobCategory.create({
      data: {
        id: jobCategoryId,
        name: "Engineering 98",
        slug: "engineering-98",
      },
    });

    await prisma.jobPosting.create({
      data: {
        id: jobPostingId,
        title: "Legacy Posting 98",
        slug: "legacy-posting-98",
        description: "Legacy description",
        categoryId: jobCategoryId,
        pipelineId,
        employmentType: "FULL_TIME",
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe("ApplicationOutcome Enum and Initial Semantics", () => {
    it("defaults outcome to NONE when not explicitly provided", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
        },
      });

      expect(app.outcome).toBe("NONE");
      expect(app.outcome).toBe(ApplicationOutcome.NONE);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("accepts all canonical ApplicationOutcome enum values", async () => {
      const outcomes: ApplicationOutcome[] = [
        ApplicationOutcome.NONE,
        ApplicationOutcome.HIRED,
        ApplicationOutcome.REJECTED,
        ApplicationOutcome.WITHDRAWN,
        ApplicationOutcome.CANCELLED,
      ];

      for (const outcome of outcomes) {
        const app = await prisma.application.create({
          data: {
            id: appId1,
            tenantId: testTenantId,
            candidateId,
            vacancyId,
            currentStageId: stage1Id,
            outcome,
          },
        });

        expect(app.outcome).toBe(outcome);

        const fetched = await prisma.application.findUnique({
          where: { id: appId1 },
          select: { outcome: true },
        });
        expect(fetched?.outcome).toBe(outcome);

        await prisma.application.delete({ where: { id: appId1 } });
      }
    });

    it("fails closed at the database level when an invalid outcome is inserted via SQL", async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "applications" ("id", "tenant_id", "candidate_id", "vacancy_id", "current_stage_id", "outcome")
          VALUES (${appId1}::uuid, ${testTenantId}::uuid, ${candidateId}::uuid, ${vacancyId}::uuid, ${stage1Id}::uuid, 'INVALID_OUTCOME'::application_outcomes)
        `
      ).rejects.toThrow();
    });
  });

  describe("Location Assignment Foundation", () => {
    it("persists application with null assignedVacancyLocationId (whole-vacancy application)", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          assignedVacancyLocationId: null,
        },
        include: {
          assignedVacancyLocation: true,
        },
      });

      expect(app.assignedVacancyLocationId).toBeNull();
      expect(app.assignedVacancyLocation).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("persists application with assigned VacancyLocation", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          assignedVacancyLocationId: vacancyLocationId,
        },
        include: {
          assignedVacancyLocation: true,
        },
      });

      expect(app.assignedVacancyLocationId).toBe(vacancyLocationId);
      expect(app.assignedVacancyLocation).not.toBeNull();
      expect(app.assignedVacancyLocation?.vacancyId).toBe(vacancyId);

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Canonical Vacancy and Tenant Relations", () => {
    it("persists application with canonical vacancy and queries relationship", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
        },
        include: {
          vacancy: true,
          tenant: true,
        },
      });

      expect(app.vacancyId).toBe(vacancyId);
      expect(app.vacancy?.title).toBe("Test Vacancy 98");
      expect(app.tenantId).toBe(testTenantId);
      expect(app.tenant?.slug).toBe("test-tenant-98");

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed on non-existent vacancyId via foreign key constraint", async () => {
      const nonExistentVacancyId = "98000000-0000-4000-a000-000000000999";
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: testTenantId,
            candidateId,
            vacancyId: nonExistentVacancyId,
            currentStageId: stage1Id,
          },
        })
      ).rejects.toThrow();
    });

    it("fails closed on non-existent tenantId via foreign key constraint", async () => {
      const nonExistentTenantId = "98000000-0000-4000-a000-000000000999";
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: nonExistentTenantId,
            candidateId,
            vacancyId,
            currentStageId: stage1Id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Canonical currentStage and Sourcing Relations", () => {
    it("persists application with currentStageId referencing PipelineStage", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          sourceId,
        },
        include: {
          currentStage: true,
          source: true,
        },
      });

      expect(app.currentStageId).toBe(stage1Id);
      expect(app.currentStage?.name).toBe("Applied");
      expect(app.currentStage?.category).toBe("APPLIED");
      expect(app.sourceId).toBe(sourceId);
      expect(app.source?.name).toBe("Career Site 98");

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("ApplicationStageHistory Tenant Foundation", () => {
    it("persists stage history with optional tenantId", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
        },
      });

      const history = await prisma.applicationStageHistory.create({
        data: {
          tenantId: testTenantId,
          applicationId: app.id,
          fromStageId: stage1Id,
          toStageId: stage2Id,
          notes: "Initial screening move",
        },
        include: {
          tenant: true,
        },
      });

      expect(history.tenantId).toBe(testTenantId);
      expect(history.tenant?.slug).toBe("test-tenant-98");
      expect(history.toStageId).toBe(stage2Id);

      await prisma.applicationStageHistory.deleteMany({
        where: { applicationId: app.id },
      });
      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Legacy Compatibility Preservation", () => {
    it("permits creating canonical application with null legacy jobPostingId and stageId", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          jobPostingId: null,
          stageId: null,
        },
      });

      expect(app.jobPostingId).toBeNull();
      expect(app.stageId).toBeNull();
      expect(app.vacancyId).toBe(vacancyId);
      expect(app.currentStageId).toBe(stage1Id);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("permits creating legacy application referencing jobPostingId and stageId", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
        },
        include: {
          jobPosting: true,
          stage: true,
        },
      });

      expect(app.jobPostingId).toBe(jobPostingId);
      expect(app.jobPosting?.title).toBe("Legacy Posting 98");
      expect(app.stageId).toBe(stage1Id);
      expect(app.stage?.name).toBe("Applied");
      expect(app.outcome).toBe("NONE");

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("preserves legacy @@unique([candidateId, jobPostingId]) constraint", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
        },
      });

      // Duplicate legacy candidate + jobPosting must fail
      await expect(
        prisma.application.create({
          data: {
            id: appId2,
            candidateId,
            jobPostingId,
            stageId: stage2Id,
          },
        })
      ).rejects.toThrow();

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Referential ON DELETE RESTRICT Semantics (Real PostgreSQL)", () => {
    it("rejects deletion of referenced legacy JobPosting and preserves Application data intact", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
        },
      });

      expect(app.jobPostingId).toBe(jobPostingId);

      // Attempt to delete referenced JobPosting must fail closed via FK constraint
      await expect(
        prisma.jobPosting.delete({
          where: { id: jobPostingId },
        })
      ).rejects.toThrow();

      // Application must remain completely unchanged in PostgreSQL
      const persistedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(persistedApp).not.toBeNull();
      expect(persistedApp?.jobPostingId).toBe(jobPostingId);
      expect(persistedApp?.stageId).toBe(stage1Id);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("rejects deletion of referenced legacy PipelineStage and preserves Application data intact", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
        },
      });

      expect(app.stageId).toBe(stage1Id);

      // Attempt to delete referenced PipelineStage must fail closed via FK constraint
      await expect(
        prisma.pipelineStage.delete({
          where: { id: stage1Id },
        })
      ).rejects.toThrow();

      // Application must remain completely unchanged in PostgreSQL
      const persistedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(persistedApp).not.toBeNull();
      expect(persistedApp?.stageId).toBe(stage1Id);
      expect(persistedApp?.jobPostingId).toBe(jobPostingId);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("rejects deletion of referenced canonical currentStage and preserves Application.currentStageId intact", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
        },
      });

      expect(app.currentStageId).toBe(stage1Id);

      // Attempt to delete referenced PipelineStage must fail closed via FK constraint
      await expect(
        prisma.pipelineStage.delete({
          where: { id: stage1Id },
        })
      ).rejects.toThrow();

      // Application.currentStageId must remain completely unchanged in PostgreSQL
      const persistedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(persistedApp).not.toBeNull();
      expect(persistedApp?.currentStageId).toBe(stage1Id);
      expect(persistedApp?.vacancyId).toBe(vacancyId);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("rejects deletion of referenced assigned VacancyLocation and preserves assignedVacancyLocationId intact", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          assignedVacancyLocationId: vacancyLocationId,
        },
      });

      expect(app.assignedVacancyLocationId).toBe(vacancyLocationId);

      // Attempt to delete referenced VacancyLocation must fail closed via FK constraint
      await expect(
        prisma.vacancyLocation.delete({
          where: { id: vacancyLocationId },
        })
      ).rejects.toThrow();

      // assignedVacancyLocationId must remain completely intact in PostgreSQL (never set to NULL)
      const persistedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(persistedApp).not.toBeNull();
      expect(persistedApp?.assignedVacancyLocationId).toBe(vacancyLocationId);
      expect(persistedApp?.vacancyId).toBe(vacancyId);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("rejects deletion of referenced canonical Vacancy and preserves Application.vacancyId intact", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
        },
      });

      expect(app.vacancyId).toBe(vacancyId);

      // Attempt to delete referenced Vacancy must fail closed via FK constraint
      await expect(
        prisma.vacancy.delete({
          where: { id: vacancyId },
        })
      ).rejects.toThrow();

      // Application.vacancyId must remain completely unchanged in PostgreSQL
      const persistedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(persistedApp).not.toBeNull();
      expect(persistedApp?.vacancyId).toBe(vacancyId);

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Static Migration and Concurrency Guards", () => {
    it("verifies in PostgreSQL metadata that all Application structural foreign keys have delete_rule = RESTRICT", async () => {
      const constraints: Array<{ constraint_name: string; delete_rule: string }> = await prisma.$queryRaw`
        SELECT constraint_name, delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_name IN (
          'applications_job_posting_id_fkey',
          'applications_stage_id_fkey',
          'applications_current_stage_id_fkey',
          'applications_candidate_id_fkey',
          'applications_tenant_id_candidate_id_fkey',
          'applications_vacancy_id_fkey',
          'applications_tenant_id_vacancy_id_fkey',
          'applications_assigned_vacancy_location_id_fkey',
          'applications_tenant_id_vacancy_id_assigned_vacancy_locatio_fkey'
        )
        ORDER BY constraint_name;
      `;

      expect(constraints.length).toBe(9);
      for (const c of constraints) {
        expect(c.delete_rule).toBe("RESTRICT");
      }
    });
    it("confirms NO unconditional unique constraint on (candidateId, vacancyId) in T01", async () => {
      // In T01, multiple applications for the same candidate + vacancy can exist before T03 adds the partial index
      const appA = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          outcome: "REJECTED",
        },
      });

      const appB = await prisma.application.create({
        data: {
          id: appId2,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          outcome: "NONE",
        },
      });

      expect(appA.candidateId).toBe(candidateId);
      expect(appB.candidateId).toBe(candidateId);
      expect(appA.vacancyId).toBe(vacancyId);
      expect(appB.vacancyId).toBe(vacancyId);

      await prisma.application.deleteMany({
        where: { id: { in: [appId1, appId2] } },
      });
    });

    it("confirms active partial unique index exists on applications (implemented in T03)", async () => {
      const indexes: Array<{ indexname: string; indexdef: string }> = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'applications'
      `;

      const partialIndex = indexes.find(
        (idx) =>
          idx.indexdef.toLowerCase().includes("where") &&
          idx.indexdef.toLowerCase().includes("outcome")
      );

      expect(partialIndex).toBeDefined();
      expect(partialIndex?.indexname).toBe("applications_active_tenant_candidate_vacancy_key");
    });

    it("confirms JobPosting and CandidateLead tables remain in PostgreSQL schema for deferred drops", async () => {
      const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('job_postings', 'candidate_leads')
      `;

      const tableNames = tables.map((t) => t.table_name);
      expect(tableNames).toContain("job_postings");
      expect(tableNames).toContain("candidate_leads");
    });

    it("confirms VacancyLocation alternate key (tenant_id, vacancy_id, id) is unique in DB", async () => {
      const indexes: Array<{ indexname: string; indexdef: string }> = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'vacancy_locations'
          AND indexname = 'vacancy_locations_tenant_id_vacancy_id_id_key'
      `;

      expect(indexes.length).toBe(1);
      expect(indexes[0].indexdef).toContain("tenant_id");
      expect(indexes[0].indexdef).toContain("vacancy_id");
      expect(indexes[0].indexdef).toContain("id");
    });

    it("verifies exact canonical values for ApplicationOutcome", () => {
      const expectedOutcomes = ["NONE", "HIRED", "REJECTED", "WITHDRAWN", "CANCELLED"];
      const actualOutcomes = Object.values(ApplicationOutcome);
      expect(actualOutcomes.sort()).toEqual(expectedOutcomes.sort());
    });
  });

  describe("Fixture Cleanup Verification", () => {
    it("ensures zero residual rows exist under 98000000-... namespace", async () => {
      await cleanup();

      const residualTenants = await prisma.tenant.count({
        where: { id: { in: [testTenantId, foreignTenantId] } },
      });
      const residualApps = await prisma.application.count({
        where: { id: { in: [appId1, appId2, appId3] } },
      });
      const residualVacancies = await prisma.vacancy.count({
        where: { id: vacancyId },
      });
      const residualCandidates = await prisma.candidate.count({
        where: { id: candidateId },
      });

      expect(residualTenants).toBe(0);
      expect(residualApps).toBe(0);
      expect(residualVacancies).toBe(0);
      expect(residualCandidates).toBe(0);
    });
  });
});
