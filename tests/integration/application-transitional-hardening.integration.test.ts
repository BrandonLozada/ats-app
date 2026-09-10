import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { ApplicationOutcome } from "@/generated/prisma/client";

describe("I6-S6-T03: Transitional Tenant-Safe Persistence Hardening & Active Partial Unique Integration Tests", () => {
  // Deterministic 98200000-... namespace
  const tenantA = "98200000-0000-4000-a000-000000000001";
  const tenantB = "98200000-0000-4000-a000-000000000002";

  const legalEntityA = "98200000-0000-4000-a000-000000000011";
  const legalEntityB = "98200000-0000-4000-a000-000000000012";

  const locationA = "98200000-0000-4000-a000-000000000021";
  const locationB = "98200000-0000-4000-a000-000000000022";

  const departmentA = "98200000-0000-4000-a000-000000000031";
  const departmentB = "98200000-0000-4000-a000-000000000032";

  const pipelineA = "98200000-0000-4000-a000-000000000041";
  const pipelineVersionA = "98200000-0000-4000-a000-000000000042";
  const stageA1 = "98200000-0000-4000-a000-000000000043";
  const stageA2 = "98200000-0000-4000-a000-000000000044";

  const pipelineB = "98200000-0000-4000-a000-000000000051";
  const pipelineVersionB = "98200000-0000-4000-a000-000000000052";
  const stageB1 = "98200000-0000-4000-a000-000000000053";

  // Vacancies
  const vacancyA1 = "98200000-0000-4000-a000-000000000061";
  const vacancyLocA1 = "98200000-0000-4000-a000-000000000062";
  const vacancyA2 = "98200000-0000-4000-a000-000000000063";
  const vacancyLocA2 = "98200000-0000-4000-a000-000000000064";

  const vacancyB1 = "98200000-0000-4000-a000-000000000071";
  const vacancyLocB1 = "98200000-0000-4000-a000-000000000072";

  // Candidates
  const candidateA1 = "98200000-0000-4000-a000-000000000081";
  const candidateA2 = "98200000-0000-4000-a000-000000000082";
  const candidateB1 = "98200000-0000-4000-a000-000000000083";

  // Legacy Postings & Categories
  const jobCategoryId = "98200000-0000-4000-a000-000000000091";
  const jobPostingA = "98200000-0000-4000-a000-000000000092";
  const jobPostingB = "98200000-0000-4000-a000-000000000093";

  // Application IDs
  const appId1 = "98200000-0000-4000-b000-000000000001";
  const appId2 = "98200000-0000-4000-b000-000000000002";
  const appId3 = "98200000-0000-4000-b000-000000000003";
  const appId4 = "98200000-0000-4000-b000-000000000004";

  // History IDs
  const histId1 = "98200000-0000-4000-c000-000000000001";
  const histId2 = "98200000-0000-4000-c000-000000000002";

  async function cleanupApplicationsAndHistories() {
    await prisma.applicationStageHistory.deleteMany({
      where: {
        OR: [
          { tenantId: { in: [tenantA, tenantB] } },
          { id: { in: [histId1, histId2] } },
          { application: { id: { in: [appId1, appId2, appId3, appId4] } } },
        ],
      },
    });

    await prisma.application.deleteMany({
      where: {
        OR: [
          { id: { in: [appId1, appId2, appId3, appId4] } },
          { tenantId: { in: [tenantA, tenantB] } },
          { candidateId: { in: [candidateA1, candidateA2, candidateB1] } },
          { vacancyId: { in: [vacancyA1, vacancyA2, vacancyB1] } },
          { jobPostingId: { in: [jobPostingA, jobPostingB] } },
        ],
      },
    });
  }

  async function cleanupAll() {
    await cleanupApplicationsAndHistories();

    await prisma.vacancyLocation.deleteMany({
      where: { id: { in: [vacancyLocA1, vacancyLocA2, vacancyLocB1] } },
    });

    await prisma.vacancy.deleteMany({
      where: { id: { in: [vacancyA1, vacancyA2, vacancyB1] } },
    });

    await prisma.jobPosting.deleteMany({
      where: { id: { in: [jobPostingA, jobPostingB] } },
    });

    await prisma.jobCategory.deleteMany({
      where: { id: jobCategoryId },
    });

    await prisma.candidate.deleteMany({
      where: { id: { in: [candidateA1, candidateA2, candidateB1] } },
    });

    await prisma.pipelineStage.deleteMany({
      where: { id: { in: [stageA1, stageA2, stageB1] } },
    });

    await prisma.pipelineVersion.deleteMany({
      where: { id: { in: [pipelineVersionA, pipelineVersionB] } },
    });

    await prisma.hiringPipeline.deleteMany({
      where: { id: { in: [pipelineA, pipelineB] } },
    });

    await prisma.location.deleteMany({
      where: { id: { in: [locationA, locationB] } },
    });

    await prisma.legalEntity.deleteMany({
      where: { id: { in: [legalEntityA, legalEntityB] } },
    });

    await prisma.department.deleteMany({
      where: { id: { in: [departmentA, departmentB] } },
    });

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB] } },
    });
  }

  beforeAll(async () => {
    await cleanupAll();

    // 1. Tenants
    await prisma.tenant.create({
      data: { id: tenantA, name: "Tenant A 982", slug: "tenant-a-982" },
    });
    await prisma.tenant.create({
      data: { id: tenantB, name: "Tenant B 982", slug: "tenant-b-982" },
    });

    // 2. Org hierarchy
    await prisma.department.createMany({
      data: [
        { id: departmentA, tenantId: tenantA, name: "Dept A", slug: "dept-a" },
        { id: departmentB, tenantId: tenantB, name: "Dept B", slug: "dept-b" },
      ],
    });

    await prisma.legalEntity.createMany({
      data: [
        { id: legalEntityA, tenantId: tenantA, name: "Legal A", code: "LEA" },
        { id: legalEntityB, tenantId: tenantB, name: "Legal B", code: "LEB" },
      ],
    });

    await prisma.location.createMany({
      data: [
        { id: locationA, tenantId: tenantA, legalEntityId: legalEntityA, name: "Loc A", code: "LOCA" },
        { id: locationB, tenantId: tenantB, legalEntityId: legalEntityB, name: "Loc B", code: "LOCB" },
      ],
    });

    // 3. Pipelines
    await prisma.hiringPipeline.createMany({
      data: [
        { id: pipelineA, tenantId: tenantA, name: "Pipe A", isDefault: true },
        { id: pipelineB, tenantId: tenantB, name: "Pipe B", isDefault: true },
      ],
    });

    await prisma.pipelineVersion.createMany({
      data: [
        { id: pipelineVersionA, tenantId: tenantA, pipelineId: pipelineA, version: 1, status: "PUBLISHED" },
        { id: pipelineVersionB, tenantId: tenantB, pipelineId: pipelineB, version: 1, status: "PUBLISHED" },
      ],
    });

    await prisma.pipelineStage.createMany({
      data: [
        { id: stageA1, pipelineVersionId: pipelineVersionA, name: "A Applied", category: "APPLIED", order: 1, isInitial: true },
        { id: stageA2, pipelineVersionId: pipelineVersionA, name: "A Screening", category: "SCREENING", order: 2, isInitial: false },
        { id: stageB1, pipelineVersionId: pipelineVersionB, name: "B Applied", category: "APPLIED", order: 1, isInitial: true },
      ],
    });

    // 4. Vacancies & VacancyLocations
    await prisma.vacancy.createMany({
      data: [
        {
          id: vacancyA1,
          tenantId: tenantA,
          departmentId: departmentA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA,
          title: "Vacancy A1",
          slug: "vacancy-a1",
          status: "PUBLISHED",
          openings: 1,
        },
        {
          id: vacancyA2,
          tenantId: tenantA,
          departmentId: departmentA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA,
          title: "Vacancy A2",
          slug: "vacancy-a2",
          status: "PUBLISHED",
          openings: 1,
        },
        {
          id: vacancyB1,
          tenantId: tenantB,
          departmentId: departmentB,
          legalEntityId: legalEntityB,
          pipelineVersionId: pipelineVersionB,
          title: "Vacancy B1",
          slug: "vacancy-b1",
          status: "PUBLISHED",
          openings: 1,
        },
      ],
    });

    await prisma.vacancyLocation.createMany({
      data: [
        { id: vacancyLocA1, tenantId: tenantA, vacancyId: vacancyA1, legalEntityId: legalEntityA, locationId: locationA, openings: 1 },
        { id: vacancyLocA2, tenantId: tenantA, vacancyId: vacancyA2, legalEntityId: legalEntityA, locationId: locationA, openings: 1 },
        { id: vacancyLocB1, tenantId: tenantB, vacancyId: vacancyB1, legalEntityId: legalEntityB, locationId: locationB, openings: 1 },
      ],
    });

    // 5. Candidates
    await prisma.candidate.createMany({
      data: [
        { id: candidateA1, tenantId: tenantA, firstName: "Cand", lastName: "A1", name: "Cand A1", email: "a1@test.com", emailNormalized: "a1@test.com" },
        { id: candidateA2, tenantId: tenantA, firstName: "Cand", lastName: "A2", name: "Cand A2", email: "a2@test.com", emailNormalized: "a2@test.com" },
        { id: candidateB1, tenantId: tenantB, firstName: "Cand", lastName: "B1", name: "Cand B1", email: "b1@test.com", emailNormalized: "b1@test.com" },
      ],
    });

    // 6. Legacy JobCategory & Postings
    await prisma.jobCategory.create({
      data: { id: jobCategoryId, name: "Legacy Cat 982", slug: "legacy-cat-982" },
    });

    await prisma.jobPosting.createMany({
      data: [
        { id: jobPostingA, title: "Posting A", slug: "posting-a-982", description: "Desc", categoryId: jobCategoryId, pipelineId: pipelineA, employmentType: "FULL_TIME" },
        { id: jobPostingB, title: "Posting B", slug: "posting-b-982", description: "Desc", categoryId: jobCategoryId, pipelineId: pipelineB, employmentType: "FULL_TIME" },
      ],
    });
  });

  afterAll(async () => {
    await cleanupAll();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupApplicationsAndHistories();
  });

  describe("Section 3: Compound Candidate FK [tenantId, candidateId]", () => {
    it("canonical Application with same tenant Candidate -> PASS", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
        },
      });

      expect(app.id).toBe(appId1);
      expect(app.tenantId).toBe(tenantA);
      expect(app.candidateId).toBe(candidateA1);
    });

    it("canonical Application with cross-tenant Candidate -> FAIL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: tenantA,
            candidateId: candidateB1, // Belongs to Tenant B!
            vacancyId: vacancyA1,
            currentStageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Section 4: Compound Vacancy FK [tenantId, vacancyId]", () => {
    it("canonical Application with same tenant Vacancy -> PASS", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
        },
      });

      expect(app.vacancyId).toBe(vacancyA1);
      expect(app.tenantId).toBe(tenantA);
    });

    it("canonical Application with cross-tenant Vacancy -> FAIL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: tenantA,
            candidateId: candidateA1,
            vacancyId: vacancyB1, // Belongs to Tenant B!
            currentStageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Section 5: Compound Assigned VacancyLocation FK [tenantId, vacancyId, assignedVacancyLocationId]", () => {
    it("NULL assignedVacancyLocationId -> PASS", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          assignedVacancyLocationId: null,
        },
      });

      expect(app.assignedVacancyLocationId).toBeNull();
    });

    it("same tenant + same vacancy location -> PASS", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          assignedVacancyLocationId: vacancyLocA1, // Belongs to Tenant A, Vacancy A1
        },
      });

      expect(app.assignedVacancyLocationId).toBe(vacancyLocA1);
    });

    it("same tenant + wrong vacancy location -> FAIL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: tenantA,
            candidateId: candidateA1,
            vacancyId: vacancyA1, // Vacancy A1
            currentStageId: stageA1,
            assignedVacancyLocationId: vacancyLocA2, // Belongs to Vacancy A2!
          },
        })
      ).rejects.toThrow();
    });

    it("wrong tenant location -> FAIL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: tenantA,
            candidateId: candidateA1,
            vacancyId: vacancyA1,
            currentStageId: stageA1,
            assignedVacancyLocationId: vacancyLocB1, // Belongs to Tenant B!
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Section 6: ApplicationStageHistory Compound Parent FK [tenantId, applicationId]", () => {
    it("canonical history with same tenant parent Application -> PASS", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
        },
      });

      const hist = await prisma.applicationStageHistory.create({
        data: {
          id: histId1,
          tenantId: tenantA,
          applicationId: appId1,
          toStageId: stageA1,
        },
      });

      expect(hist.id).toBe(histId1);
      expect(hist.tenantId).toBe(tenantA);
      expect(hist.applicationId).toBe(appId1);
    });

    it("canonical history with different tenant parent Application -> FAIL", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
        },
      });

      await expect(
        prisma.applicationStageHistory.create({
          data: {
            id: histId1,
            tenantId: tenantB, // History says Tenant B, parent is Tenant A!
            applicationId: appId1,
            toStageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Section 15: Transitional Legacy Compatibility", () => {
    it("permits legacy Application with tenantId, vacancyId, currentStageId = NULL", async () => {
      const legacyApp = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
          candidateId: candidateA1,
          jobPostingId: jobPostingA,
          stageId: stageA1,
        },
      });

      expect(legacyApp.id).toBe(appId1);
      expect(legacyApp.tenantId).toBeNull();
      expect(legacyApp.vacancyId).toBeNull();
      expect(legacyApp.currentStageId).toBeNull();
      expect(legacyApp.jobPostingId).toBe(jobPostingA);
      expect(legacyApp.stageId).toBe(stageA1);
    });

    it("permits legacy ApplicationStageHistory with tenantId = NULL", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
          candidateId: candidateA1,
          jobPostingId: jobPostingA,
          stageId: stageA1,
        },
      });

      const legacyHist = await prisma.applicationStageHistory.create({
        data: {
          id: histId1,
          tenantId: null,
          applicationId: appId1,
          toStageId: stageA1,
        },
      });

      expect(legacyHist.id).toBe(histId1);
      expect(legacyHist.tenantId).toBeNull();
      expect(legacyHist.applicationId).toBe(appId1);
    });
  });

  describe("Section 16: Active Application Partial Unique Constraint", () => {
    it("canonical active duplicate (tenant A, candidate C, vacancy V, outcome NONE x2) -> second insert rejected", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      await expect(
        prisma.application.create({
          data: {
            id: appId2,
            tenantId: tenantA,
            candidateId: candidateA1,
            vacancyId: vacancyA1,
            currentStageId: stageA1,
            outcome: ApplicationOutcome.NONE,
          },
        })
      ).rejects.toThrow();
    });

    it("terminal + active (REJECTED + NONE) -> accepted", async () => {
      const app1 = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.REJECTED,
        },
      });

      const app2 = await prisma.application.create({
        data: {
          id: appId2,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      expect(app1.outcome).toBe(ApplicationOutcome.REJECTED);
      expect(app2.outcome).toBe(ApplicationOutcome.NONE);
    });

    it("multiple terminal (REJECTED, WITHDRAWN, CANCELLED) on same candidate/vacancy -> accepted", async () => {
      const app1 = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.REJECTED,
        },
      });

      const app2 = await prisma.application.create({
        data: {
          id: appId2,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.WITHDRAWN,
        },
      });

      const app3 = await prisma.application.create({
        data: {
          id: appId3,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.CANCELLED,
        },
      });

      expect(app1.outcome).toBe(ApplicationOutcome.REJECTED);
      expect(app2.outcome).toBe(ApplicationOutcome.WITHDRAWN);
      expect(app3.outcome).toBe(ApplicationOutcome.CANCELLED);
    });

    it("terminalize and reapply: NONE -> REJECTED -> new NONE -> accepted", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      // Terminalize app1
      await prisma.application.update({
        where: { id: appId1 },
        data: { outcome: ApplicationOutcome.REJECTED },
      });

      // Reapply (insert new NONE)
      const app2 = await prisma.application.create({
        data: {
          id: appId2,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      expect(app2.id).toBe(appId2);
      expect(app2.outcome).toBe(ApplicationOutcome.NONE);
    });

    it("cross-tenant independence: same candidate business concept across distinct tenants -> independent", async () => {
      const appA = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          currentStageId: stageA1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      const appB = await prisma.application.create({
        data: {
          id: appId2,
          tenantId: tenantB,
          candidateId: candidateB1,
          vacancyId: vacancyB1,
          currentStageId: stageB1,
          outcome: ApplicationOutcome.NONE,
        },
      });

      expect(appA.tenantId).toBe(tenantA);
      expect(appB.tenantId).toBe(tenantB);
      expect(appA.outcome).toBe(ApplicationOutcome.NONE);
      expect(appB.outcome).toBe(ApplicationOutcome.NONE);
    });
  });

  describe("Dual-FK Transitional Existence Guarantees (Sections 3-6, 10)", () => {
    const nonExistentUuid = "98200000-0000-4000-a000-999999999999";

    it("legacy Candidate existence: rejects nonexistent candidateId even when tenantId is NULL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: null,
            candidateId: nonExistentUuid,
            jobPostingId: jobPostingA,
            stageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });

    it("legacy Candidate existence: accepts existing candidateId when tenantId is NULL", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          candidateId: candidateA1,
          jobPostingId: jobPostingA,
          stageId: stageA1,
        },
      });

      expect(app.candidateId).toBe(candidateA1);
      expect(app.tenantId).toBeNull();
    });

    it("transitional Vacancy existence: rejects nonexistent vacancyId even when tenantId is NULL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: null,
            candidateId: candidateA1,
            vacancyId: nonExistentUuid,
            stageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });

    it("transitional Vacancy existence: accepts NULL vacancyId for legacy rows", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          candidateId: candidateA1,
          vacancyId: null,
          stageId: stageA1,
        },
      });

      expect(app.vacancyId).toBeNull();
    });

    it("transitional Vacancy existence: accepts existing vacancyId when tenantId is NULL", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          candidateId: candidateA1,
          vacancyId: vacancyA1,
          stageId: stageA1,
        },
      });

      expect(app.vacancyId).toBe(vacancyA1);
    });

    it("transitional VacancyLocation existence: rejects nonexistent assignedVacancyLocationId when tenant/vacancy are NULL", async () => {
      await expect(
        prisma.application.create({
          data: {
            id: appId1,
            tenantId: null,
            candidateId: candidateA1,
            vacancyId: null,
            assignedVacancyLocationId: nonExistentUuid,
            stageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });

    it("transitional VacancyLocation existence: accepts valid assignedVacancyLocationId with NULL tenant and vacancy", async () => {
      const app = await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          candidateId: candidateA1,
          vacancyId: null,
          assignedVacancyLocationId: vacancyLocA1,
          stageId: stageA1,
        },
      });

      expect(app.assignedVacancyLocationId).toBe(vacancyLocA1);
    });

    it("StageHistory orphan prevention: rejects nonexistent applicationId even when tenantId is NULL", async () => {
      await expect(
        prisma.applicationStageHistory.create({
          data: {
            id: histId1,
            tenantId: null,
            applicationId: nonExistentUuid,
            toStageId: stageA1,
          },
        })
      ).rejects.toThrow();
    });

    it("StageHistory orphan prevention: accepts existing legacy Application when tenantId is NULL", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: null,
          candidateId: candidateA1,
          jobPostingId: jobPostingA,
          stageId: stageA1,
        },
      });

      const hist = await prisma.applicationStageHistory.create({
        data: {
          id: histId1,
          tenantId: null,
          applicationId: appId1,
          toStageId: stageA1,
        },
      });

      expect(hist.applicationId).toBe(appId1);
      expect(hist.tenantId).toBeNull();
    });
  });

  describe("Section 17: Constraint & Column Metadata Verification", () => {
    it("confirms canonical columns remain IS_NULLABLE = YES in live PostgreSQL", async () => {
      const cols = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'applications'
          AND column_name IN ('tenant_id', 'vacancy_id', 'current_stage_id', 'assigned_vacancy_location_id')
        ORDER BY column_name;
      `;

      const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c.is_nullable]));
      expect(colMap["tenant_id"]).toBe("YES");
      expect(colMap["vacancy_id"]).toBe("YES");
      expect(colMap["current_stage_id"]).toBe("YES");
      expect(colMap["assigned_vacancy_location_id"]).toBe("YES");

      const histCols = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'application_stage_history'
          AND column_name = 'tenant_id';
      `;
      expect(histCols[0]?.is_nullable).toBe("YES");
    });

    it("confirms partial unique index definition in live PostgreSQL", async () => {
      const idxs = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'applications'
          AND indexname = 'applications_active_tenant_candidate_vacancy_key';
      `;

      expect(idxs).toHaveLength(1);
      const def = idxs[0].indexdef;
      expect(def).toContain("applications_active_tenant_candidate_vacancy_key");
      expect(def).toContain("tenant_id, candidate_id, vacancy_id");
      expect(def).toContain("outcome = 'NONE'::application_outcomes");
    });

    it("confirms all 8 dual existence and compound tenant-safe foreign keys exist with delete_rule = RESTRICT", async () => {
      const constraints: Array<{ constraint_name: string; delete_rule: string }> = await prisma.$queryRaw`
        SELECT constraint_name, delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_name IN (
          'applications_candidate_id_fkey',
          'applications_tenant_id_candidate_id_fkey',
          'applications_vacancy_id_fkey',
          'applications_tenant_id_vacancy_id_fkey',
          'applications_assigned_vacancy_location_id_fkey',
          'applications_tenant_id_vacancy_id_assigned_vacancy_locatio_fkey',
          'application_stage_history_application_id_fkey',
          'application_stage_history_tenant_id_application_id_fkey'
        )
        ORDER BY constraint_name;
      `;

      expect(constraints.length).toBe(8);
      for (const c of constraints) {
        expect(c.delete_rule).toBe("RESTRICT");
      }
    });
  });
});
