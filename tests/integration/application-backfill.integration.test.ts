import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";
import { prisma } from "@/infrastructure/database/prisma.client";
import { runApplicationBackfill, computeT03Readiness } from "../../scripts/backfill-applications";

describe("I6-S6-T02: Application Backfill Integration Tests (Real PostgreSQL)", () => {
  const ns = "98100000-0000-4000-a000-";
  const testTenantId = `${ns}000000000001`;
  const foreignTenantId = `${ns}000000000002`;

  const departmentId = `${ns}000000000010`;
  const departmentBId = `${ns}000000000011`;

  const legalEntityId = `${ns}000000000020`;
  const legalEntityBId = `${ns}000000000021`;

  const locationId = `${ns}000000000030`;
  const locationBId = `${ns}000000000031`;

  const vacancyLocationId = `${ns}000000000035`;
  const vacancyLocation2Id = `${ns}000000000036`;
  const vacancyLocationBId = `${ns}000000000037`;

  const pipelineId = `${ns}000000000040`;
  const pipelineBId = `${ns}000000000041`;

  const pipelineVersionId = `${ns}000000000050`;
  const pipelineVersionBId = `${ns}000000000051`;

  const stage1Id = `${ns}000000000060`;
  const stage2Id = `${ns}000000000061`;
  const stageBId = `${ns}000000000062`; // belongs to pipelineVersionBId

  const vacancyId = `${ns}000000000070`;
  const vacancy2Id = `${ns}000000000071`;
  const vacancyBId = `${ns}000000000072`;

  const candidateId = `${ns}000000000080`;
  const candidateBId = `${ns}000000000081`; // belongs to foreignTenantId

  const jobCategoryId = `${ns}000000000090`;
  const jobPostingId = `${ns}000000000091`;
  const jobPostingUnmappedId = `${ns}000000000092`;
  const jobPostingSlugTestId = `${ns}000000000093`;

  const appId1 = `${ns}000000000101`;
  const appId2 = `${ns}000000000102`;
  const appId3 = `${ns}000000000103`;

  const historyId1 = `${ns}000000000201`;

  let pgClient: Client;

  async function cleanup() {
    // Delete in reverse dependency order
    await prisma.applicationStageHistory.deleteMany({
      where: {
        OR: [
          { id: historyId1 },
          { tenantId: { in: [testTenantId, foreignTenantId] } },
          { applicationId: { in: [appId1, appId2, appId3] } },
        ],
      },
    });

    await prisma.application.deleteMany({
      where: {
        OR: [
          { id: { in: [appId1, appId2, appId3] } },
          { tenantId: { in: [testTenantId, foreignTenantId] } },
          { candidateId: { in: [candidateId, candidateBId] } },
          { vacancyId: { in: [vacancyId, vacancy2Id, vacancyBId] } },
          { jobPostingId: { in: [jobPostingId, jobPostingUnmappedId, jobPostingSlugTestId] } },
        ],
      },
    });

    await prisma.vacancyLocation.deleteMany({
      where: {
        tenantId: { in: [testTenantId, foreignTenantId] },
      },
    });

    await prisma.vacancy.deleteMany({
      where: {
        id: { in: [vacancyId, vacancy2Id, vacancyBId] },
      },
    });

    await prisma.jobPosting.deleteMany({
      where: { id: { in: [jobPostingId, jobPostingUnmappedId, jobPostingSlugTestId] } },
    });

    await prisma.jobCategory.deleteMany({
      where: { id: jobCategoryId },
    });

    await prisma.candidate.deleteMany({
      where: { id: { in: [candidateId, candidateBId] } },
    });

    await prisma.pipelineStage.deleteMany({
      where: { id: { in: [stage1Id, stage2Id, stageBId] } },
    });

    await prisma.pipelineVersion.deleteMany({
      where: { id: { in: [pipelineVersionId, pipelineVersionBId] } },
    });

    await prisma.hiringPipeline.deleteMany({
      where: { id: { in: [pipelineId, pipelineBId] } },
    });

    await prisma.location.deleteMany({
      where: { id: { in: [locationId, locationBId] } },
    });

    await prisma.legalEntity.deleteMany({
      where: { id: { in: [legalEntityId, legalEntityBId] } },
    });

    await prisma.department.deleteMany({
      where: { id: { in: [departmentId, departmentBId] } },
    });

    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantId, foreignTenantId] } },
    });
  }

  beforeAll(async () => {
    pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();

    await cleanup();

    // 1. Tenants
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Backfill Test Tenant A",
        slug: "backfill-test-tenant-a",
      },
    });

    await prisma.tenant.create({
      data: {
        id: foreignTenantId,
        name: "Backfill Foreign Tenant B",
        slug: "backfill-foreign-tenant-b",
      },
    });

    // 2. Org hierarchy
    await prisma.department.create({
      data: {
        id: departmentId,
        tenantId: testTenantId,
        name: "Dept 981",
        slug: "dept-981",
      },
    });

    await prisma.department.create({
      data: {
        id: departmentBId,
        tenantId: foreignTenantId,
        name: "Dept B 981",
        slug: "dept-b-981",
      },
    });

    await prisma.legalEntity.create({
      data: {
        id: legalEntityId,
        tenantId: testTenantId,
        name: "Legal Entity 981",
        code: "LE981",
      },
    });

    await prisma.legalEntity.create({
      data: {
        id: legalEntityBId,
        tenantId: foreignTenantId,
        name: "Legal Entity B 981",
        code: "LEB981",
      },
    });

    await prisma.location.create({
      data: {
        id: locationId,
        tenantId: testTenantId,
        legalEntityId,
        name: "Location 981",
        code: "LOC981",
      },
    });

    await prisma.location.create({
      data: {
        id: locationBId,
        tenantId: foreignTenantId,
        legalEntityId: legalEntityBId,
        name: "Location B 981",
        code: "LOCB981",
      },
    });

    // 3. Pipelines & Versions & Stages
    await prisma.hiringPipeline.create({
      data: {
        id: pipelineId,
        tenantId: testTenantId,
        name: "Pipeline 981",
        isDefault: true,
      },
    });

    await prisma.hiringPipeline.create({
      data: {
        id: pipelineBId,
        tenantId: foreignTenantId,
        name: "Pipeline B 981",
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

    await prisma.pipelineVersion.create({
      data: {
        id: pipelineVersionBId,
        tenantId: foreignTenantId,
        pipelineId: pipelineBId,
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
        name: "Interview",
        category: "INTERVIEW",
        order: 2,
        isInitial: false,
      },
    });

    await prisma.pipelineStage.create({
      data: {
        id: stageBId,
        pipelineVersionId: pipelineVersionBId,
        name: "Foreign Applied",
        category: "APPLIED",
        order: 1,
        isInitial: true,
      },
    });

    // 4. Vacancies
    await prisma.vacancy.create({
      data: {
        id: vacancyId,
        tenantId: testTenantId,
        departmentId,
        legalEntityId,
        pipelineVersionId,
        title: "Software Engineer 981",
        slug: "software-engineer-981",
        status: "PUBLISHED",
        openings: 1,
      },
    });

    await prisma.vacancy.create({
      data: {
        id: vacancy2Id,
        tenantId: testTenantId,
        departmentId,
        legalEntityId,
        pipelineVersionId,
        title: "Product Manager 981",
        slug: "product-manager-981",
        status: "PUBLISHED",
        openings: 1,
      },
    });

    await prisma.vacancy.create({
      data: {
        id: vacancyBId,
        tenantId: foreignTenantId,
        departmentId: departmentBId,
        legalEntityId: legalEntityBId,
        pipelineVersionId: pipelineVersionBId,
        title: "Foreign Vacancy 981",
        slug: "foreign-vacancy-981",
        status: "PUBLISHED",
        openings: 1,
      },
    });

    // 4b. VacancyLocations
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

    await prisma.vacancyLocation.create({
      data: {
        id: vacancyLocation2Id,
        tenantId: testTenantId,
        vacancyId: vacancy2Id,
        legalEntityId,
        locationId,
        openings: 1,
      },
    });

    await prisma.vacancyLocation.create({
      data: {
        id: vacancyLocationBId,
        tenantId: foreignTenantId,
        vacancyId: vacancyBId,
        legalEntityId: legalEntityBId,
        locationId: locationBId,
        openings: 1,
      },
    });

    // 5. Candidates
    await prisma.candidate.create({
      data: {
        id: candidateId,
        tenantId: testTenantId,
        firstName: "Alice",
        lastName: "Smith",
        name: "Alice Smith",
        email: "alice981@example.com",
        emailNormalized: "alice981@example.com",
      },
    });

    await prisma.candidate.create({
      data: {
        id: candidateBId,
        tenantId: foreignTenantId,
        firstName: "Bob",
        lastName: "Jones",
        name: "Bob Jones",
        email: "bob981@example.com",
        emailNormalized: "bob981@example.com",
      },
    });

    // 6. JobCategory & JobPosting
    await prisma.jobCategory.create({
      data: {
        id: jobCategoryId,
        name: "Engineering 981",
        slug: "engineering-981",
      },
    });

    await prisma.jobPosting.create({
      data: {
        id: jobPostingId,
        title: "Software Engineer 981",
        slug: "software-engineer-981",
        description: "Legacy Posting for Backfill Testing",
        categoryId: jobCategoryId,
        departmentId,
        pipelineId,
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
      },
    });

    await prisma.jobPosting.create({
      data: {
        id: jobPostingUnmappedId,
        title: "Software Engineer 981",
        slug: "software-engineer-unmapped-981",
        description: "Legacy Posting without authoritative mapping (identical title & department to Vacancy)",
        categoryId: jobCategoryId,
        departmentId,
        pipelineId,
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
      },
    });

    await prisma.jobPosting.create({
      data: {
        id: jobPostingSlugTestId,
        title: "Staff Engineer Slug Test 981",
        slug: "staff-engineer-slug-test-981",
        description: "Legacy Posting to test slug mapping rejection",
        categoryId: jobCategoryId,
        departmentId,
        pipelineId,
        employmentType: "FULL_TIME",
        status: "PUBLISHED",
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    if (pgClient) {
      await pgClient.end();
    }
  });

  afterEach(async () => {
    await prisma.applicationStageHistory.deleteMany({
      where: {
        OR: [
          { id: historyId1 },
          { applicationId: { in: [appId1, appId2, appId3] } },
        ],
      },
    });
    await prisma.application.deleteMany({
      where: {
        id: { in: [appId1, appId2, appId3] },
      },
    });
  });

  describe("Empty State & Scoped Execution", () => {
    it("handles empty scope with status SUCCESS and zero writes", async () => {
      const nonExistentId = `${ns}000000000999`;
      const result = await runApplicationBackfill({ applicationIds: [nonExistentId] }, pgClient);

      expect(result.status).toBe("SUCCESS");
      expect(result.inspectedCount).toBe(0);
      expect(result.migratedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.blockedCount).toBe(0);
      expect(result.readinessReport?.isT03Ready).toBe(true);
    });
  });

  describe("Deterministic Legacy Application Backfill & Idempotency", () => {
    it("migrates legacy Application to canonical fields and preserves outcome NONE and location null", async () => {
      // Create purely legacy Application
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          // Canonical fields explicitly absent
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
          assignedVacancyLocationId: null,
          outcome: "NONE",
        },
      });

      // Create unassociated stage history with null tenant
      await prisma.applicationStageHistory.create({
        data: {
          id: historyId1,
          applicationId: appId1,
          fromStageId: null,
          toStageId: stage1Id,
          tenantId: null,
          notes: "Initial legacy submission",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("SUCCESS");
      expect(result.inspectedCount).toBe(1);
      expect(result.migratedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.stageHistoryMigratedCount).toBe(1);

      // Verify Application in DB
      const updatedApp = await prisma.application.findUnique({
        where: { id: appId1 },
      });
      expect(updatedApp?.tenantId).toBe(testTenantId);
      expect(updatedApp?.vacancyId).toBe(vacancyId);
      expect(updatedApp?.currentStageId).toBe(stage1Id);
      expect(updatedApp?.jobPostingId).toBe(jobPostingId);
      expect(updatedApp?.stageId).toBe(stage1Id);
      expect(updatedApp?.assignedVacancyLocationId).toBeNull();
      expect(updatedApp?.outcome).toBe("NONE");

      // Verify StageHistory in DB
      const updatedHist = await prisma.applicationStageHistory.findUnique({
        where: { id: historyId1 },
      });
      expect(updatedHist?.tenantId).toBe(testTenantId);
      expect(updatedHist?.toStageId).toBe(stage1Id);
      expect(updatedHist?.notes).toBe("Initial legacy submission");

      // Idempotent second run
      const secondResult = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(secondResult.status).toBe("SUCCESS");
      expect(secondResult.inspectedCount).toBe(1);
      expect(secondResult.migratedCount).toBe(0);
      expect(secondResult.skippedCount).toBe(1);
      expect(secondResult.stageHistoryMigratedCount).toBe(0);
      expect(secondResult.stageHistorySkippedCount).toBe(1);

      // Cleanup
      await prisma.applicationStageHistory.delete({ where: { id: historyId1 } });
      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Validation Guards & Conflict Fail-Closed Rejections", () => {
    it("fails closed when Candidate tenant does not match target Vacancy tenant", async () => {
      // Candidate B belongs to foreignTenantId, but Vacancy belongs to testTenantId
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId: candidateBId,
          jobPostingId,
          stageId: stage1Id,
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("Candidate tenant");
      expect(result.blockedReason).toContain("does not match Vacancy tenant");

      // Assert zero mutation
      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();
      expect(unmutated?.vacancyId).toBeNull();
      expect(unmutated?.currentStageId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when legacy stage does not belong to target Vacancy pipeline version", async () => {
      // stageB belongs to foreign pipelineVersionBId
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stageBId,
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("pipeline_version");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();
      expect(unmutated?.vacancyId).toBeNull();
      expect(unmutated?.currentStageId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when existing Application has conflicting canonical vacancyId", async () => {
      // Application already has vacancy2Id, but legacy JobPosting maps to vacancyId
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          tenantId: null,
          vacancyId: vacancy2Id, // Conflict!
          currentStageId: null,
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("conflicting vacancy_id");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.vacancyId).toBe(vacancy2Id);
      expect(unmutated?.tenantId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when existing Application has conflicting canonical currentStageId", async () => {
      // Application already has currentStageId = stage2Id, but legacy stageId = stage1Id
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          tenantId: null,
          vacancyId: null,
          currentStageId: stage2Id, // Conflict!
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("conflicting current_stage_id");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.currentStageId).toBe(stage2Id);
      expect(unmutated?.tenantId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when canonical Application has conflicting legacy stageId", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          stageId: stage2Id, // Conflict with currentStageId!
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        { applicationIds: [appId1] },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("conflicts with legacy stage_id");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.currentStageId).toBe(stage1Id);
      expect(unmutated?.stageId).toBe(stage2Id);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when canonical Application has conflicting legacy jobPostingId", async () => {
      // Canonical vacancyId is vacancy2Id, but jobPostingId maps to vacancyId
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId: vacancy2Id, // Conflict with jobPostingId mapping!
          currentStageId: stage1Id,
          jobPostingId,
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("conflicts with authorized Vacancy mapping");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.vacancyId).toBe(vacancy2Id);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when canonical Application has legacy jobPostingId without authoritative mapping", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          jobPostingId: jobPostingUnmappedId,
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("No authoritative Vacancy mapping exists for legacy JobPosting");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.vacancyId).toBe(vacancyId);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when legacy Application has JobPosting without authoritative mapping (no heuristic fallback)", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId: jobPostingUnmappedId,
          stageId: stage1Id,
          outcome: "NONE",
        },
      });

      // Run with happy-path mapping for jobPostingId present; jobPostingUnmappedId is genuinely absent from both maps
      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("No authoritative Vacancy mapping exists for legacy JobPosting");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();
      expect(unmutated?.vacancyId).toBeNull();
      expect(unmutated?.currentStageId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when config provides slug-only mapping without exact JobPosting ID", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId: jobPostingSlugTestId,
          stageId: stage1Id,
          outcome: "NONE",
        },
      });

      // Provide slug mapping only: "staff-engineer-slug-test-981" -> vacancyId, but NOT [jobPostingSlugTestId]
      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            "staff-engineer-slug-test-981": vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("No authoritative Vacancy mapping exists for legacy JobPosting");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();
      expect(unmutated?.vacancyId).toBeNull();
      expect(unmutated?.currentStageId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Assigned VacancyLocation Validation", () => {
    it("successfully backfills Application with valid assigned VacancyLocation", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          assignedVacancyLocationId: vacancyLocationId, // Valid: belongs to testTenantId & vacancyId
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("SUCCESS");
      expect(result.migratedCount).toBe(1);

      const updatedApp = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(updatedApp?.tenantId).toBe(testTenantId);
      expect(updatedApp?.vacancyId).toBe(vacancyId);
      expect(updatedApp?.assignedVacancyLocationId).toBe(vacancyLocationId);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when assigned VacancyLocation belongs to a different Vacancy", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          assignedVacancyLocationId: vacancyLocation2Id, // Belongs to vacancy2Id, but app resolves to vacancyId!
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("does not match expected Vacancy");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();
      expect(unmutated?.vacancyId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("fails closed when assigned VacancyLocation belongs to a different Tenant", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          assignedVacancyLocationId: vacancyLocationBId, // Belongs to foreignTenantId!
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("does not match expected tenant");

      const unmutated = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(unmutated?.tenantId).toBeNull();

      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("T03 Readiness Metric & Scoped Isolation", () => {
    it("tracks assignedVacancyLocationMismatchCount and fails isT03Ready when mismatch exists", async () => {
      // Create application with location belonging to wrong vacancy
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          assignedVacancyLocationId: vacancyLocation2Id, // Mismatch with vacancyId!
          outcome: "NONE",
        },
      });

      const readiness = await computeT03Readiness(pgClient, [appId1]);
      expect(readiness.assignedVacancyLocationMismatchCount).toBe(1);
      expect(readiness.isT03Ready).toBe(false);

      await prisma.application.delete({ where: { id: appId1 } });
    });

    it("ensures unrelated Applications and StageHistories outside scope do not contaminate scoped readiness", async () => {
      // Valid canonical application
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          outcome: "NONE",
        },
      });

      // Unrelated dirty application outside scope
      await prisma.application.create({
        data: {
          id: appId2,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          tenantId: null, // Null tenant!
          vacancyId: null, // Null vacancy!
          currentStageId: null,
          outcome: "NONE",
        },
      });

      // Unrelated StageHistory on appId2 with null tenant
      await prisma.applicationStageHistory.create({
        data: {
          id: historyId1,
          applicationId: appId2,
          toStageId: stage1Id,
          tenantId: null, // Null tenant!
        },
      });

      // Compute readiness ONLY for scoped appId1
      const readiness = await computeT03Readiness(pgClient, [appId1]);
      expect(readiness.totalApplications).toBe(1);
      expect(readiness.tenantIdNullCount).toBe(0);
      expect(readiness.vacancyIdNullCount).toBe(0);
      expect(readiness.currentStageIdNullCount).toBe(0);
      expect(readiness.stageHistoryTenantNullCount).toBe(0);
      expect(readiness.assignedVacancyLocationMismatchCount).toBe(0);
      expect(readiness.activeDuplicateGroupsCount).toBe(0);
      expect(readiness.isT03Ready).toBe(true);

      await prisma.applicationStageHistory.delete({ where: { id: historyId1 } });
      await prisma.application.deleteMany({ where: { id: { in: [appId1, appId2] } } });
    });
  });

  describe("Duplicate Groups Audit", () => {
    it("fails closed when active duplicate group exists (same tenant + candidate + vacancy + outcome NONE)", async () => {
      // App A is already canonical with outcome NONE
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          outcome: "NONE",
        },
      });

      // App B is legacy, which would resolve to same tenant + candidate + vacancy with outcome NONE
      await prisma.application.create({
        data: {
          id: appId2,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1, appId2],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.blockedReason).toContain("ACTIVE APPLICATION DUPLICATES REQUIRE DECISION");
      expect(result.activeDuplicateGroupsCount).toBe(1);

      // Verify zero arbitrary resolution
      const app2 = await prisma.application.findUnique({ where: { id: appId2 } });
      expect(app2?.tenantId).toBeNull();
      expect(app2?.vacancyId).toBeNull();

      await prisma.application.deleteMany({ where: { id: { in: [appId1, appId2] } } });
    });

    it("allows terminal historical duplicates without blocking active application uniqueness", async () => {
      // App A is historical REJECTED
      await prisma.application.create({
        data: {
          id: appId1,
          tenantId: testTenantId,
          candidateId,
          vacancyId,
          currentStageId: stage1Id,
          outcome: "REJECTED",
        },
      });

      // App B is active NONE (re-application after rejection)
      await prisma.application.create({
        data: {
          id: appId2,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          outcome: "NONE",
        },
      });

      const result = await runApplicationBackfill(
        {
          applicationIds: [appId1, appId2],
          jobPostingToVacancyMap: {
            [jobPostingId]: vacancyId,
          },
        },
        pgClient
      );

      expect(result.status).toBe("SUCCESS");
      expect(result.activeDuplicateGroupsCount).toBe(0);
      expect(result.terminalDuplicateGroupsCount).toBe(0);

      const app2 = await prisma.application.findUnique({ where: { id: appId2 } });
      expect(app2?.tenantId).toBe(testTenantId);
      expect(app2?.vacancyId).toBe(vacancyId);
      expect(app2?.outcome).toBe("NONE");

      await prisma.application.deleteMany({ where: { id: { in: [appId1, appId2] } } });
    });
  });

  describe("Transaction Rollback Safety", () => {
    it("rolls back transaction and keeps injected Client usable when error occurs during transaction", async () => {
      await prisma.application.create({
        data: {
          id: appId1,
          candidateId,
          jobPostingId,
          stageId: stage1Id,
          tenantId: null,
          vacancyId: null,
          currentStageId: null,
        },
      });

      await prisma.applicationStageHistory.create({
        data: {
          id: historyId1,
          applicationId: appId1,
          fromStageId: null,
          toStageId: stage1Id,
          tenantId: null,
        },
      });

      // Execute with simulateFailureAfterUpdate = true
      await expect(
        runApplicationBackfill(
          {
            applicationIds: [appId1],
            jobPostingToVacancyMap: {
              [jobPostingId]: vacancyId,
            },
            simulateFailureAfterUpdate: true,
          },
          pgClient
        )
      ).rejects.toThrow("Simulated failure after update for rollback testing");

      // Verify that NO partial writes occurred
      const app = await prisma.application.findUnique({ where: { id: appId1 } });
      expect(app?.tenantId).toBeNull();
      expect(app?.vacancyId).toBeNull();
      expect(app?.currentStageId).toBeNull();

      const hist = await prisma.applicationStageHistory.findUnique({ where: { id: historyId1 } });
      expect(hist?.tenantId).toBeNull();

      // Verify injected pgClient is still usable for queries
      const queryCheck = await pgClient.query("SELECT 1 AS num;");
      expect(queryCheck.rows[0].num).toBe(1);

      await prisma.applicationStageHistory.delete({ where: { id: historyId1 } });
      await prisma.application.delete({ where: { id: appId1 } });
    });
  });

  describe("Fixture Cleanup Verification", () => {
    it("ensures zero residual rows exist under 98100000-... namespace", async () => {
      await cleanup();

      const residualTenants = await prisma.tenant.count({
        where: { id: { in: [testTenantId, foreignTenantId] } },
      });
      const residualApps = await prisma.application.count({
        where: { id: { in: [appId1, appId2, appId3] } },
      });
      const residualVacancies = await prisma.vacancy.count({
        where: { id: { in: [vacancyId, vacancy2Id, vacancyBId] } },
      });
      const residualCandidates = await prisma.candidate.count({
        where: { id: { in: [candidateId, candidateBId] } },
      });

      expect(residualTenants).toBe(0);
      expect(residualApps).toBe(0);
      expect(residualVacancies).toBe(0);
      expect(residualCandidates).toBe(0);
    });
  });
});
