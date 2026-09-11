import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  createApplication,
} from "@/modules/recruiting/public.server";
import {
  PrismaApplicationRepository,
} from "@/modules/recruiting/infrastructure/prisma-application-repository";
import { createApplicationUseCase } from "@/modules/recruiting/application/application/create-application";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  ApplicationOutcome,
  StageCategory,
  VacancyStatus,
  SourceType,
} from "@/generated/prisma/client";

describe("I6-S6-T04: Application Capability Integration Tests (Real PostgreSQL)", () => {
  // Deterministic 98300000-... namespace
  const tenantA = "98300000-0000-4000-a000-000000000001";
  const tenantB = "98300000-0000-4000-a000-000000000002";

  const userA = "98300000-0000-4000-a000-000000000003";
  const userB = "98300000-0000-4000-a000-000000000004";

  const membershipA = "98300000-0000-4000-a000-000000000005";
  const membershipB = "98300000-0000-4000-a000-000000000006";

  const deptA = "98300000-0000-4000-a000-000000000011";
  const deptB = "98300000-0000-4000-a000-000000000012";

  const legalEntityA = "98300000-0000-4000-a000-000000000021";
  const legalEntityB = "98300000-0000-4000-a000-000000000022";

  const locationA1 = "98300000-0000-4000-a000-000000000031";
  const locationA2 = "98300000-0000-4000-a000-000000000032";
  const locationB1 = "98300000-0000-4000-a000-000000000033";

  // Pipelines & Versions
  const pipelineA = "98300000-0000-4000-a000-000000000041";
  const pipelineVersionA1 = "98300000-0000-4000-a000-000000000042"; // Pinned v1
  const pipelineVersionA2 = "98300000-0000-4000-a000-000000000043"; // Newer v2
  const pipelineVersionNoInitial = "98300000-0000-4000-a000-000000000044"; // No initial stage

  const stageA1_applied = "98300000-0000-4000-a000-000000000045";
  const stageA1_interview = "98300000-0000-4000-a000-000000000046";
  const stageA2_applied = "98300000-0000-4000-a000-000000000047";
  const stageNoInitial_interview = "98300000-0000-4000-a000-000000000048";

  const pipelineB = "98300000-0000-4000-a000-000000000049";
  const pipelineVersionB1 = "98300000-0000-4000-a000-000000000050";
  const stageB1_applied = "98300000-0000-4000-a000-000000000051";

  // Vacancies
  const vacancyA_published = "98300000-0000-4000-a000-000000000061";
  const vacancyLocA1 = "98300000-0000-4000-a000-000000000062";

  const vacancyA_other = "98300000-0000-4000-a000-000000000063";
  const vacancyLocA_other = "98300000-0000-4000-a000-000000000064";

  const vacancyA_draft = "98300000-0000-4000-a000-000000000065";
  const vacancyA_paused = "98300000-0000-4000-a000-000000000066";
  const vacancyA_closed = "98300000-0000-4000-a000-000000000067";
  const vacancyA_noInitial = "98300000-0000-4000-a000-000000000068";

  const vacancyB_published = "98300000-0000-4000-a000-000000000069";
  const vacancyLocB1 = "98300000-0000-4000-a000-000000000070";

  // Candidates
  const candidateA1 = "98300000-0000-4000-a000-000000000081";
  const candidateA2 = "98300000-0000-4000-a000-000000000082";
  const candidateA3 = "98300000-0000-4000-a000-000000000083";
  const candidateB1 = "98300000-0000-4000-a000-000000000084";

  // Sources
  const sourceActive = "98300000-0000-4000-a000-000000000091";
  const sourceInactive = "98300000-0000-4000-a000-000000000092";

  const ctxA: AuthenticatedContext = {
    actor: {
      userId: userA,
      email: "recruiter.a@ama.test",
      name: "Recruiter A",
    },
    tenant: {
      tenantId: tenantA,
      slug: "tenant-a-983",
      name: "Tenant A 983",
    },
    membership: {
      membershipId: membershipA,
    },
    roles: ["recruiter"],
    permissions: ["application.create"],
  };

  const ctxB: AuthenticatedContext = {
    actor: {
      userId: userB,
      email: "recruiter.b@ama.test",
      name: "Recruiter B",
    },
    tenant: {
      tenantId: tenantB,
      slug: "tenant-b-983",
      name: "Tenant B 983",
    },
    membership: {
      membershipId: membershipB,
    },
    roles: ["recruiter"],
    permissions: ["application.create"],
  };

  const ctxNoPerm: AuthenticatedContext = {
    actor: {
      userId: userA,
      email: "recruiter.a@ama.test",
      name: "Recruiter A",
    },
    tenant: {
      tenantId: tenantA,
      slug: "tenant-a-983",
      name: "Tenant A 983",
    },
    membership: {
      membershipId: membershipA,
    },
    roles: ["recruiter"],
    permissions: [],
  };

  async function cleanupApplications() {
    await prisma.applicationStageHistory.deleteMany({
      where: {
        OR: [
          { tenantId: { in: [tenantA, tenantB] } },
          { application: { candidateId: { in: [candidateA1, candidateA2, candidateA3, candidateB1] } } },
        ],
      },
    });

    await prisma.application.deleteMany({
      where: {
        OR: [
          { tenantId: { in: [tenantA, tenantB] } },
          { candidateId: { in: [candidateA1, candidateA2, candidateA3, candidateB1] } },
          { vacancyId: { in: [vacancyA_published, vacancyA_other, vacancyA_draft, vacancyA_paused, vacancyA_closed, vacancyA_noInitial, vacancyB_published] } },
        ],
      },
    });
  }

  async function cleanupAll() {
    await cleanupApplications();

    await prisma.applicationSource.deleteMany({
      where: { id: { in: [sourceActive, sourceInactive] } },
    });

    await prisma.candidate.deleteMany({
      where: { id: { in: [candidateA1, candidateA2, candidateA3, candidateB1] } },
    });

    await prisma.vacancyLocation.deleteMany({
      where: { id: { in: [vacancyLocA1, vacancyLocA_other, vacancyLocB1] } },
    });

    await prisma.vacancy.deleteMany({
      where: {
        id: {
          in: [
            vacancyA_published,
            vacancyA_other,
            vacancyA_draft,
            vacancyA_paused,
            vacancyA_closed,
            vacancyA_noInitial,
            vacancyB_published,
          ],
        },
      },
    });

    await prisma.pipelineStage.deleteMany({
      where: {
        id: {
          in: [
            stageA1_applied,
            stageA1_interview,
            stageA2_applied,
            stageNoInitial_interview,
            stageB1_applied,
          ],
        },
      },
    });

    await prisma.pipelineVersion.deleteMany({
      where: {
        id: {
          in: [
            pipelineVersionA1,
            pipelineVersionA2,
            pipelineVersionNoInitial,
            pipelineVersionB1,
          ],
        },
      },
    });

    await prisma.hiringPipeline.deleteMany({
      where: { id: { in: [pipelineA, pipelineB] } },
    });

    await prisma.location.deleteMany({
      where: { id: { in: [locationA1, locationA2, locationB1] } },
    });

    await prisma.legalEntity.deleteMany({
      where: { id: { in: [legalEntityA, legalEntityB] } },
    });

    await prisma.department.deleteMany({
      where: { id: { in: [deptA, deptB] } },
    });

    await prisma.tenantMembership.deleteMany({
      where: { id: { in: [membershipA, membershipB] } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: [userA, userB] } },
    });

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB] } },
    });
  }

  beforeAll(async () => {
    await cleanupAll();

    // 1. Tenants
    await prisma.tenant.create({
      data: { id: tenantA, name: "Tenant A 983", slug: "tenant-a-983" },
    });
    await prisma.tenant.create({
      data: { id: tenantB, name: "Tenant B 983", slug: "tenant-b-983" },
    });

    // 2. Users & Memberships
    await prisma.user.createMany({
      data: [
        { id: userA, email: "user.a.983@ama.test", name: "User A" },
        { id: userB, email: "user.b.983@ama.test", name: "User B" },
      ],
    });

    await prisma.tenantMembership.createMany({
      data: [
        { id: membershipA, tenantId: tenantA, userId: userA },
        { id: membershipB, tenantId: tenantB, userId: userB },
      ],
    });

    // 3. Departments
    await prisma.department.createMany({
      data: [
        { id: deptA, tenantId: tenantA, name: "Dept A", slug: "dept-a-983" },
        { id: deptB, tenantId: tenantB, name: "Dept B", slug: "dept-b-983" },
      ],
    });

    // 4. LegalEntities
    await prisma.legalEntity.createMany({
      data: [
        { id: legalEntityA, tenantId: tenantA, name: "Legal A", code: "LA-983" },
        { id: legalEntityB, tenantId: tenantB, name: "Legal B", code: "LB-983" },
      ],
    });

    // 5. Locations
    await prisma.location.createMany({
      data: [
        { id: locationA1, tenantId: tenantA, legalEntityId: legalEntityA, name: "Loc A1" },
        { id: locationA2, tenantId: tenantA, legalEntityId: legalEntityA, name: "Loc A2" },
        { id: locationB1, tenantId: tenantB, legalEntityId: legalEntityB, name: "Loc B1" },
      ],
    });

    // 6. Pipelines & Versions
    await prisma.hiringPipeline.createMany({
      data: [
        { id: pipelineA, tenantId: tenantA, name: "Pipeline A 983" },
        { id: pipelineB, tenantId: tenantB, name: "Pipeline B 983" },
      ],
    });

    await prisma.pipelineVersion.createMany({
      data: [
        { id: pipelineVersionA1, tenantId: tenantA, pipelineId: pipelineA, version: 1, status: "PUBLISHED" },
        { id: pipelineVersionA2, tenantId: tenantA, pipelineId: pipelineA, version: 2, status: "PUBLISHED" },
        { id: pipelineVersionNoInitial, tenantId: tenantA, pipelineId: pipelineA, version: 3, status: "PUBLISHED" },
        { id: pipelineVersionB1, tenantId: tenantB, pipelineId: pipelineB, version: 1, status: "PUBLISHED" },
      ],
    });

    // 7. Stages
    await prisma.pipelineStage.createMany({
      data: [
        {
          id: stageA1_applied,
          pipelineVersionId: pipelineVersionA1,
          name: "Postulado",
          category: StageCategory.APPLIED,
          order: 1,
          isInitial: true,
        },
        {
          id: stageA1_interview,
          pipelineVersionId: pipelineVersionA1,
          name: "Entrevista",
          category: StageCategory.INTERVIEW,
          order: 2,
          isInitial: false,
        },
        {
          id: stageA2_applied,
          pipelineVersionId: pipelineVersionA2,
          name: "Postulado v2",
          category: StageCategory.APPLIED,
          order: 1,
          isInitial: true,
        },
        {
          id: stageNoInitial_interview,
          pipelineVersionId: pipelineVersionNoInitial,
          name: "Only Interview",
          category: StageCategory.INTERVIEW,
          order: 1,
          isInitial: false,
        },
        {
          id: stageB1_applied,
          pipelineVersionId: pipelineVersionB1,
          name: "Postulado B",
          category: StageCategory.APPLIED,
          order: 1,
          isInitial: true,
        },
      ],
    });

    // 8. Vacancies
    await prisma.vacancy.createMany({
      data: [
        {
          id: vacancyA_published,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA1,
          title: "Nurse A",
          slug: "nurse-a-983",
          status: VacancyStatus.PUBLISHED,
          openings: 2,
        },
        {
          id: vacancyA_other,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA1,
          title: "Doctor A",
          slug: "doctor-a-983",
          status: VacancyStatus.PUBLISHED,
          openings: 1,
        },
        {
          id: vacancyA_draft,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA1,
          title: "Draft Vacancy",
          slug: "draft-vac-983",
          status: VacancyStatus.DRAFT,
          openings: 1,
        },
        {
          id: vacancyA_paused,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA1,
          title: "Paused Vacancy",
          slug: "paused-vac-983",
          status: VacancyStatus.PAUSED,
          openings: 1,
        },
        {
          id: vacancyA_closed,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionA1,
          title: "Closed Vacancy",
          slug: "closed-vac-983",
          status: VacancyStatus.CLOSED,
          openings: 1,
        },
        {
          id: vacancyA_noInitial,
          tenantId: tenantA,
          departmentId: deptA,
          legalEntityId: legalEntityA,
          pipelineVersionId: pipelineVersionNoInitial,
          title: "No Initial Vacancy",
          slug: "no-initial-vac-983",
          status: VacancyStatus.PUBLISHED,
          openings: 1,
        },
        {
          id: vacancyB_published,
          tenantId: tenantB,
          departmentId: deptB,
          legalEntityId: legalEntityB,
          pipelineVersionId: pipelineVersionB1,
          title: "Nurse B",
          slug: "nurse-b-983",
          status: VacancyStatus.PUBLISHED,
          openings: 1,
        },
      ],
    });

    // 9. Vacancy Locations
    await prisma.vacancyLocation.createMany({
      data: [
        {
          id: vacancyLocA1,
          tenantId: tenantA,
          vacancyId: vacancyA_published,
          legalEntityId: legalEntityA,
          locationId: locationA1,
          openings: 2,
        },
        {
          id: vacancyLocA_other,
          tenantId: tenantA,
          vacancyId: vacancyA_other,
          legalEntityId: legalEntityA,
          locationId: locationA2,
          openings: 1,
        },
        {
          id: vacancyLocB1,
          tenantId: tenantB,
          vacancyId: vacancyB_published,
          legalEntityId: legalEntityB,
          locationId: locationB1,
          openings: 1,
        },
      ],
    });

    // 10. Candidates
    await prisma.candidate.createMany({
      data: [
        {
          id: candidateA1,
          tenantId: tenantA,
          name: "Candidate A1",
          firstName: "Cand",
          lastName: "A1",
          email: "canda1@ama.test",
          emailNormalized: "canda1@ama.test",
        },
        {
          id: candidateA2,
          tenantId: tenantA,
          name: "Candidate A2",
          firstName: "Cand",
          lastName: "A2",
          email: "canda2@ama.test",
          emailNormalized: "canda2@ama.test",
        },
        {
          id: candidateA3,
          tenantId: tenantA,
          name: "Candidate A3",
          firstName: "Cand",
          lastName: "A3",
          email: "canda3@ama.test",
          emailNormalized: "canda3@ama.test",
        },
        {
          id: candidateB1,
          tenantId: tenantB,
          name: "Candidate B1",
          firstName: "Cand",
          lastName: "B1",
          email: "candb1@ama.test",
          emailNormalized: "candb1@ama.test",
        },
      ],
    });

    // 11. Application Sources
    await prisma.applicationSource.createMany({
      data: [
        {
          id: sourceActive,
          name: "Website 983",
          type: SourceType.INTERNAL,
          isActive: true,
        },
        {
          id: sourceInactive,
          name: "Old Portal 983",
          type: SourceType.EXTERNAL,
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupAll();
  });

  beforeEach(async () => {
    await cleanupApplications();
  });

  describe("Section 40: Core Application Creation Scenarios", () => {
    it("happy path: atomically initializes Application + initial StageHistory with canonical fields", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        notes: "Excellent profile",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const app = result.value;
      expect(app.tenantId).toBe(tenantA);
      expect(app.candidateId).toBe(candidateA1);
      expect(app.vacancyId).toBe(vacancyA_published);
      expect(app.currentStageId).toBe(stageA1_applied);
      expect(app.outcome).toBe("NONE");
      expect(app.createdById).toBe(userA);
      expect(app.notes).toBe("Excellent profile");

      // Verify PostgreSQL Application record directly
      const dbApp = await prisma.application.findUnique({
        where: { id: app.id },
      });
      expect(dbApp).not.toBeNull();
      expect(dbApp?.tenantId).toBe(tenantA);
      expect(dbApp?.candidateId).toBe(candidateA1);
      expect(dbApp?.vacancyId).toBe(vacancyA_published);
      expect(dbApp?.currentStageId).toBe(stageA1_applied);
      expect(dbApp?.outcome).toBe(ApplicationOutcome.NONE);
      expect(dbApp?.jobPostingId).toBeNull();
      expect(dbApp?.stageId).toBeNull();

      // Verify initial ApplicationStageHistory record directly
      const dbHistories = await prisma.applicationStageHistory.findMany({
        where: { applicationId: app.id },
      });
      expect(dbHistories).toHaveLength(1);
      const hist = dbHistories[0];
      expect(hist.tenantId).toBe(tenantA);
      expect(hist.fromStageId).toBeNull();
      expect(hist.toStageId).toBe(stageA1_applied);
      expect(hist.movedById).toBe(userA);
    });

    it("fails closed with FORBIDDEN when actor lacks application.create permission", async () => {
      const result = await createApplication(ctxNoPerm, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }

      const count = await prisma.application.count({
        where: { candidateId: candidateA1 },
      });
      expect(count).toBe(0);
    });

    it("fails closed with APPLICATION_CANDIDATE_NOT_FOUND on cross-tenant Candidate", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateB1, // Belongs to tenantB
        vacancyId: vacancyA_published,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_CANDIDATE_NOT_FOUND");
      }

      const count = await prisma.application.count({
        where: { candidateId: candidateB1 },
      });
      expect(count).toBe(0);
    });

    it("fails closed with APPLICATION_VACANCY_NOT_FOUND on cross-tenant Vacancy", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyB_published, // Belongs to tenantB
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_VACANCY_NOT_FOUND");
      }

      const count = await prisma.application.count({
        where: { candidateId: candidateA1 },
      });
      expect(count).toBe(0);
    });

    it("fails closed with APPLICATION_CANDIDATE_NOT_FOUND on nonexistent Candidate", async () => {
      const result = await createApplication(ctxA, {
        candidateId: "98300000-0000-4000-a000-999999999999",
        vacancyId: vacancyA_published,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_CANDIDATE_NOT_FOUND");
      }
    });

    it("fails closed with APPLICATION_VACANCY_NOT_FOUND on nonexistent Vacancy", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: "98300000-0000-4000-a000-999999999999",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_VACANCY_NOT_FOUND");
      }
    });

    it("rejects application when Vacancy status is DRAFT", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_draft,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
      }
    });

    it("rejects application when Vacancy status is PAUSED", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_paused,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
      }
    });

    it("rejects application when Vacancy status is CLOSED", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_closed,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
      }
    });

    it("resolves initial stage strictly from Vacancy's pinned PipelineVersion (not latest/newer)", async () => {
      // vacancyA_published is pinned to pipelineVersionA1
      // pipelineVersionA2 is a newer version with stageA2_applied
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.currentStageId).toBe(stageA1_applied);
        expect(result.value.currentStageId).not.toBe(stageA2_applied);
      }
    });

    it("fails closed with INITIAL_STAGE_NOT_FOUND when pipeline version has no initial stage", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_noInitial,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INITIAL_STAGE_NOT_FOUND");
      }
    });

    it("accepts null assignedVacancyLocationId representing application to whole Vacancy", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        assignedVacancyLocationId: null,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assignedVacancyLocationId).toBeNull();
      }
    });

    it("persists valid assigned VacancyLocation when location belongs to vacancy", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        assignedVacancyLocationId: vacancyLocA1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assignedVacancyLocationId).toBe(vacancyLocA1);
      }
    });

    it("fails closed with VACANCY_LOCATION_NOT_FOUND when assigned location belongs to another Vacancy", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        assignedVacancyLocationId: vacancyLocA_other, // Belongs to vacancyA_other
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_LOCATION_NOT_FOUND");
      }
    });

    it("fails closed with VACANCY_LOCATION_NOT_FOUND on cross-tenant location without leakage", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        assignedVacancyLocationId: vacancyLocB1, // Belongs to tenantB
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_LOCATION_NOT_FOUND");
      }
    });

    it("persists valid ApplicationSource when source exists and is active", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        sourceId: sourceActive,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sourceId).toBe(sourceActive);
      }
    });

    it("fails closed with APPLICATION_SOURCE_NOT_FOUND when source is inactive", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        sourceId: sourceInactive,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_SOURCE_NOT_FOUND");
      }
    });

    it("fails closed with APPLICATION_SOURCE_NOT_FOUND when source does not exist", async () => {
      const result = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
        sourceId: "98300000-0000-4000-a000-999999999999",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_SOURCE_NOT_FOUND");
      }
    });

    it("precheck rejects duplicate active application (same tenant, candidate, vacancy, outcome NONE)", async () => {
      // 1. First application succeeds
      const firstResult = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });
      expect(firstResult.ok).toBe(true);

      // 2. Second application fails closed via precheck
      const secondResult = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });
      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.error.code).toBe("APPLICATION_ALREADY_ACTIVE");
      }

      // Verify only 1 application in DB
      const count = await prisma.application.count({
        where: {
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA_published,
        },
      });
      expect(count).toBe(1);
    });

    it("permits new active application after prior application was terminalized (REJECTED)", async () => {
      // 1. First application created
      const firstResult = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });
      expect(firstResult.ok).toBe(true);
      if (!firstResult.ok) return;

      // 2. Terminalize first application to REJECTED
      await prisma.application.update({
        where: { id: firstResult.value.id },
        data: { outcome: ApplicationOutcome.REJECTED },
      });

      // 3. New application for same candidate & vacancy now succeeds
      const secondResult = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });
      expect(secondResult.ok).toBe(true);
      if (secondResult.ok) {
        expect(secondResult.value.outcome).toBe("NONE");
        expect(secondResult.value.id).not.toBe(firstResult.value.id);
      }

      // Verify DB has both records
      const apps = await prisma.application.findMany({
        where: {
          tenantId: tenantA,
          candidateId: candidateA1,
          vacancyId: vacancyA_published,
        },
      });
      expect(apps).toHaveLength(2);
    });
  });

  describe("Section 41: Real Concurrency Safety (PostgreSQL Partial Unique)", () => {
    it("concurrent create calls for same candidate and vacancy result in exactly 1 success and 1 APPLICATION_ALREADY_ACTIVE", async () => {
      const results = await Promise.allSettled([
        createApplication(ctxA, {
          candidateId: candidateA2,
          vacancyId: vacancyA_published,
        }),
        createApplication(ctxA, {
          candidateId: candidateA2,
          vacancyId: vacancyA_published,
        }),
      ]);

      type CreateAppResult = Awaited<ReturnType<typeof createApplication>>;
      const fulfilled = results.map((r) => {
        expect(r.status).toBe("fulfilled");
        return (r as PromiseFulfilledResult<CreateAppResult>).value;
      });

      const successes = fulfilled.filter((res) => res.ok === true);
      const duplicates = fulfilled.filter(
        (res) => res.ok === false && res.error.code === "APPLICATION_ALREADY_ACTIVE"
      );

      expect(successes).toHaveLength(1);
      expect(duplicates).toHaveLength(1);

      // Verify PostgreSQL database state: exactly 1 Application and 1 StageHistory
      const appCount = await prisma.application.count({
        where: {
          tenantId: tenantA,
          candidateId: candidateA2,
          vacancyId: vacancyA_published,
        },
      });
      expect(appCount).toBe(1);

      const createdApp = await prisma.application.findFirst({
        where: {
          tenantId: tenantA,
          candidateId: candidateA2,
          vacancyId: vacancyA_published,
        },
      });
      expect(createdApp).not.toBeNull();

      const historyCount = await prisma.applicationStageHistory.count({
        where: {
          applicationId: createdApp!.id,
        },
      });
      expect(historyCount).toBe(1);
    });
  });

  describe("Section 42: Atomic Transaction Rollback", () => {
    it("rolls back Application creation if stage history insertion fails", async () => {
      // Create a repository instance with a test-hook simulating post-create failure
      const failingRepo = new PrismaApplicationRepository({
        testHookAfterAppCreate: async () => {
          throw new Error("Simulated transactional failure before history commit");
        },
      });
      const failingUseCase = createApplicationUseCase(failingRepo);

      const result = await failingUseCase(ctxA, {
        candidateId: candidateA3,
        vacancyId: vacancyA_published,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
      }

      // Verify full transaction rollback in PostgreSQL: 0 Application rows, 0 StageHistory rows
      const appCount = await prisma.application.count({
        where: {
          tenantId: tenantA,
          candidateId: candidateA3,
          vacancyId: vacancyA_published,
        },
      });
      expect(appCount).toBe(0);

      const historyCount = await prisma.applicationStageHistory.count({
        where: {
          tenantId: tenantA,
        },
      });
      // Any preexisting histories for candidateA3 are 0
      expect(historyCount).toBe(0);
    });
  });

  describe("Section 48: Fixture Teardown and Scope Isolation", () => {
    it("confirms cross-tenant candidate independence allows simultaneous active applications across tenants", async () => {
      const resA = await createApplication(ctxA, {
        candidateId: candidateA1,
        vacancyId: vacancyA_published,
      });
      const resB = await createApplication(ctxB, {
        candidateId: candidateB1,
        vacancyId: vacancyB_published,
      });

      expect(resA.ok).toBe(true);
      expect(resB.ok).toBe(true);

      if (resA.ok && resB.ok) {
        expect(resA.value.tenantId).toBe(tenantA);
        expect(resB.value.tenantId).toBe(tenantB);
      }
    });
  });
});
