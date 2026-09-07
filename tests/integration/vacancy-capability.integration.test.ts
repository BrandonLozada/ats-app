import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  createVacancy,
  publishVacancy,
} from "@/modules/recruiting/public.server";
import type { AuthenticatedContext } from "@/modules/organization/public";

describe("Recruiting Vacancy Capability Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "93000000-0000-4000-d000-000000000001";
  const tenantBId = "93000000-0000-4000-d000-000000000002";

  const userAId = "93000000-0000-4000-d000-000000000011";
  const userBId = "93000000-0000-4000-d000-000000000012";

  const legalEntityA1Id = "93000000-0000-4000-d000-000000000021";
  const legalEntityA2Id = "93000000-0000-4000-d000-000000000022";
  const legalEntityB1Id = "93000000-0000-4000-d000-000000000023";

  const locationA1_1Id = "93000000-0000-4000-d000-000000000031";
  const locationA1_2Id = "93000000-0000-4000-d000-000000000032";
  const locationA2_1Id = "93000000-0000-4000-d000-000000000033";
  const locationB1_1Id = "93000000-0000-4000-d000-000000000034";

  const departmentAId = "93000000-0000-4000-d000-000000000041";
  const departmentBId = "93000000-0000-4000-d000-000000000042";

  const pipeAId = "93000000-0000-4000-d000-000000000051";
  const pipeBId = "93000000-0000-4000-d000-000000000052";

  const verA1Id = "93000000-0000-4000-d000-000000000061";
  const verA2Id = "93000000-0000-4000-d000-000000000062";
  const verB1Id = "93000000-0000-4000-d000-000000000063";

  const membershipAId = "93000000-0000-4000-d000-000000000071";
  const membershipBId = "93000000-0000-4000-d000-000000000072";

  const authA: AuthenticatedContext = {
    actor: {
      userId: userAId,
      email: "recruiter_a@tenant-a.com",
      name: "Recruiter Alpha",
    },
    tenant: {
      tenantId: tenantAId,
      slug: "tenant-cap-a",
      name: "Tenant Vacancy Cap A",
    },
    membership: {
      membershipId: membershipAId,
    },
    roles: ["RECRUITER"],
    permissions: ["vacancy.create", "vacancy.publish"],
  };

  const authB: AuthenticatedContext = {
    actor: {
      userId: userBId,
      email: "recruiter_b@tenant-b.com",
      name: "Recruiter Beta",
    },
    tenant: {
      tenantId: tenantBId,
      slug: "tenant-cap-b",
      name: "Tenant Vacancy Cap B",
    },
    membership: {
      membershipId: membershipBId,
    },
    roles: ["RECRUITER"],
    permissions: ["vacancy.create", "vacancy.publish"],
  };

  const authNoPerms: AuthenticatedContext = {
    ...authA,
    permissions: [],
  };

  async function cleanup() {
    await prisma.hiringTeamMember.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.vacancyLocation.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.vacancy.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.tenantMembership.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.pipelineVersion.deleteMany({
      where: { id: { in: [verA1Id, verA2Id, verB1Id] } },
    });
    await prisma.hiringPipeline.deleteMany({
      where: { id: { in: [pipeAId, pipeBId] } },
    });
    await prisma.location.deleteMany({
      where: { id: { in: [locationA1_1Id, locationA1_2Id, locationA2_1Id, locationB1_1Id] } },
    });
    await prisma.department.deleteMany({
      where: { id: { in: [departmentAId, departmentBId] } },
    });
    await prisma.legalEntity.deleteMany({
      where: { id: { in: [legalEntityA1Id, legalEntityA2Id, legalEntityB1Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
  }

  beforeAll(async () => {
    await cleanup();

    // 1. Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, slug: "tenant-cap-a", name: "Tenant Vacancy Cap A" },
        { id: tenantBId, slug: "tenant-cap-b", name: "Tenant Vacancy Cap B" },
      ],
    });

    // 2. Users
    await prisma.user.createMany({
      data: [
        { id: userAId, email: "user_cap_a@test.com", name: "User Cap A" },
        { id: userBId, email: "user_cap_b@test.com", name: "User Cap B" },
      ],
    });

    // 3. Memberships
    await prisma.tenantMembership.createMany({
      data: [
        { id: membershipAId, tenantId: tenantAId, userId: userAId, status: "ACTIVE" },
        { id: membershipBId, tenantId: tenantBId, userId: userBId, status: "ACTIVE" },
      ],
    });

    // 4. LegalEntities
    await prisma.legalEntity.createMany({
      data: [
        { id: legalEntityA1Id, tenantId: tenantAId, name: "LE Cap A1", code: "LE-CAP-A1" },
        { id: legalEntityA2Id, tenantId: tenantAId, name: "LE Cap A2", code: "LE-CAP-A2" },
        { id: legalEntityB1Id, tenantId: tenantBId, name: "LE Cap B1", code: "LE-CAP-B1" },
      ],
    });

    // 5. Locations
    await prisma.location.createMany({
      data: [
        { id: locationA1_1Id, tenantId: tenantAId, legalEntityId: legalEntityA1Id, name: "Loc Cap A1-1" },
        { id: locationA1_2Id, tenantId: tenantAId, legalEntityId: legalEntityA1Id, name: "Loc Cap A1-2" },
        { id: locationA2_1Id, tenantId: tenantAId, legalEntityId: legalEntityA2Id, name: "Loc Cap A2-1" },
        { id: locationB1_1Id, tenantId: tenantBId, legalEntityId: legalEntityB1Id, name: "Loc Cap B1-1" },
      ],
    });

    // 6. Departments
    await prisma.department.createMany({
      data: [
        { id: departmentAId, tenantId: tenantAId, slug: "dep-cap-a", name: "Dept Cap A" },
        { id: departmentBId, tenantId: tenantBId, slug: "dep-cap-b", name: "Dept Cap B" },
      ],
    });

    // 7. Pipelines & Versions
    await prisma.hiringPipeline.createMany({
      data: [
        { id: pipeAId, tenantId: tenantAId, name: "Pipeline Cap A" },
        { id: pipeBId, tenantId: tenantBId, name: "Pipeline Cap B" },
      ],
    });

    await prisma.pipelineVersion.createMany({
      data: [
        { id: verA1Id, tenantId: tenantAId, pipelineId: pipeAId, version: 1, status: "PUBLISHED", publishedAt: new Date() },
        { id: verA2Id, tenantId: tenantAId, pipelineId: pipeAId, version: 2, status: "DRAFT" },
        { id: verB1Id, tenantId: tenantBId, pipelineId: pipeBId, version: 1, status: "PUBLISHED", publishedAt: new Date() },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("createVacancy Capability (Internal Internal Authenticated)", () => {
    it("successfully creates a DRAFT Vacancy with multi-location headcount in real PostgreSQL", async () => {
      const res = await createVacancy(authA, {
        title: "Médico Especialista",
        slug: "medico-especialista",
        description: "Puesto para médico especialista",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        employmentType: "FULL_TIME",
        openings: 5,
        locations: [
          { locationId: locationA1_1Id, openings: 3 },
          { locationId: locationA1_2Id, openings: 2 },
        ],
      });

      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("createVacancy failed");

      const created = res.value;
      expect(created.title).toBe("Médico Especialista");
      expect(created.slug).toBe("medico-especialista");
      expect(created.status).toBe("DRAFT");
      expect(created.publishedAt).toBeNull();
      expect(created.openings).toBe(5);
      expect(created.pipelineVersionId).toBe(verA1Id);
      expect(created.locations).toHaveLength(2);

      // Verify in PostgreSQL directly
      const dbVacancy = await prisma.vacancy.findUnique({
        where: { id: created.id },
      });
      expect(dbVacancy).not.toBeNull();
      expect(dbVacancy?.tenantId).toBe(tenantAId);
      expect(dbVacancy?.status).toBe("DRAFT");
      expect(dbVacancy?.publishedAt).toBeNull();
      expect(dbVacancy?.openings).toBe(5);

      const dbLocations = await prisma.vacancyLocation.findMany({
        where: { vacancyId: created.id },
        orderBy: { locationId: "asc" },
      });
      expect(dbLocations).toHaveLength(2);
      expect(dbLocations[0].tenantId).toBe(tenantAId);
      expect(dbLocations[0].openings + dbLocations[1].openings).toBe(5);
    });

    it("persists database NULL when employmentType is omitted", async () => {
      const res = await createVacancy(authA, {
        title: "Médico General Sin Tipo",
        slug: "medico-general-sin-tipo",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        // employmentType omitted
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("createVacancy failed");

      expect(res.value.employmentType).toBeNull();

      const dbRow = await prisma.vacancy.findUnique({
        where: { id: res.value.id },
      });
      expect(dbRow?.employmentType).toBeNull();
    });

    it("rejects creation if actor lacks vacancy.create permission (fail closed)", async () => {
      const res = await createVacancy(authNoPerms, {
        title: "Intento No Autorizado",
        slug: "intento-no-autorizado",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("FORBIDDEN");
      }
    });

    it("rejects creation if cross-tenant Department is referenced", async () => {
      const res = await createVacancy(authA, {
        title: "Cross Tenant Dept",
        slug: "cross-tenant-dept",
        departmentId: departmentBId, // Tenant B department
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("DEPARTMENT_NOT_FOUND");
      }
    });

    it("rejects creation if cross-tenant LegalEntity is referenced", async () => {
      const res = await createVacancy(authA, {
        title: "Cross Tenant LE",
        slug: "cross-tenant-le",
        departmentId: departmentAId,
        legalEntityId: legalEntityB1Id, // Tenant B legal entity
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("LEGAL_ENTITY_NOT_FOUND");
      }
    });

    it("rejects creation if cross-tenant Location is referenced", async () => {
      const res = await createVacancy(authA, {
        title: "Cross Tenant Loc",
        slug: "cross-tenant-loc",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationB1_1Id, openings: 1 }], // Tenant B location
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("LOCATION_NOT_FOUND");
      }
    });

    it("rejects creation if cross-tenant PipelineVersion is referenced", async () => {
      const res = await createVacancy(authA, {
        title: "Cross Tenant Pipe",
        slug: "cross-tenant-pipe",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verB1Id, // Tenant B pipeline version
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });

    it("rejects creation if Location belongs to a different LegalEntity in the same tenant", async () => {
      const res = await createVacancy(authA, {
        title: "Mismatch LE Loc",
        slug: "mismatch-le-loc",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id, // LE A1
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA2_1Id, openings: 1 }], // Location belongs to LE A2
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("LOCATION_NOT_FOUND");
      }
    });

    it("enforces tenant-isolated slug uniqueness (duplicate in same tenant rejected, allowed in other tenant)", async () => {
      const slug = "enfermera-urgencias";

      // 1. Tenant A creates vacancy
      const resA1 = await createVacancy(authA, {
        title: "Enfermera Urgencias",
        slug,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(resA1.ok).toBe(true);

      // 2. Tenant A creates second vacancy with same slug -> rejected
      const resA2 = await createVacancy(authA, {
        title: "Enfermera Urgencias Duplicada",
        slug,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(resA2.ok).toBe(false);
      if (!resA2.ok) {
        expect(resA2.error.code).toBe("VACANCY_SLUG_ALREADY_EXISTS");
      }

      // 3. Tenant B creates vacancy with same slug -> succeeds (isolated)
      const resB = await createVacancy(authB, {
        title: "Enfermera Urgencias Tenant B",
        slug,
        departmentId: departmentBId,
        legalEntityId: legalEntityB1Id,
        pipelineVersionId: verB1Id,
        openings: 1,
        locations: [{ locationId: locationB1_1Id, openings: 1 }],
      });
      expect(resB.ok).toBe(true);
    });

    it("rejects creation if PipelineVersion is not PUBLISHED (e.g. DRAFT)", async () => {
      const res = await createVacancy(authA, {
        title: "Draft Pipeline Test",
        slug: "draft-pipeline-test",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA2Id, // verA2 is DRAFT
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("PIPELINE_VERSION_NOT_PUBLISHED");
      }
    });

    it("preserves exact immutable PipelineVersion pinning when new versions are published", async () => {
      // 1. Create Vacancy pinned to verA1
      const res = await createVacancy(authA, {
        title: "Pinned Version Test",
        slug: "pinned-version-test",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("createVacancy failed");
      const vacId = res.value.id;

      // 2. Publish verA2 in the same pipeline
      await prisma.pipelineVersion.update({
        where: { id: verA2Id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      // 3. Verify in PostgreSQL that the vacancy remains pinned to verA1Id
      const dbVac = await prisma.vacancy.findUnique({
        where: { id: vacId },
      });
      expect(dbVac?.pipelineVersionId).toBe(verA1Id);
    });
  });

  describe("publishVacancy Capability & Conditional Atomic Transition", () => {
    it("successfully publishes a DRAFT vacancy and records publishedAt", async () => {
      const createRes = await createVacancy(authA, {
        title: "Terapeuta Físico",
        slug: "terapeuta-fisico",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) throw new Error("createVacancy failed");
      const vac = createRes.value;

      const pubRes = await publishVacancy(authA, { vacancyId: vac.id });
      expect(pubRes.ok).toBe(true);
      if (!pubRes.ok) throw new Error("publishVacancy failed");

      const published = pubRes.value;
      expect(published.status).toBe("PUBLISHED");
      expect(published.publishedAt).not.toBeNull();

      // Verify in DB directly
      const dbRow = await prisma.vacancy.findUnique({
        where: { id: vac.id },
      });
      expect(dbRow?.status).toBe("PUBLISHED");
      expect(dbRow?.publishedAt).not.toBeNull();
    });

    it("rejects publication if actor lacks vacancy.publish permission", async () => {
      const createRes = await createVacancy(authA, {
        title: "Intento Publicar Sin Permiso",
        slug: "intento-publicar-sin-permiso",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) throw new Error("createVacancy failed");

      const pubRes = await publishVacancy(authNoPerms, { vacancyId: createRes.value.id });
      expect(pubRes.ok).toBe(false);
      if (!pubRes.ok) {
        expect(pubRes.error.code).toBe("FORBIDDEN");
      }
    });

    it("prevents double publication and fails closed on sequential publish calls", async () => {
      const createRes = await createVacancy(authA, {
        title: "Double Publish Sequential",
        slug: "double-publish-sequential",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) throw new Error("createVacancy failed");
      const vacId = createRes.value.id;

      // First call succeeds
      const firstPub = await publishVacancy(authA, { vacancyId: vacId });
      expect(firstPub.ok).toBe(true);

      // Second call fails closed with VACANCY_ALREADY_PUBLISHED
      const secondPub = await publishVacancy(authA, { vacancyId: vacId });
      expect(secondPub.ok).toBe(false);
      if (!secondPub.ok) {
        expect(secondPub.error.code).toBe("VACANCY_ALREADY_PUBLISHED");
      }
    });

    it("conditional atomic update protects against concurrent publications (only 1 succeeds)", async () => {
      const createRes = await createVacancy(authA, {
        title: "Concurrent Publish Race",
        slug: "concurrent-publish-race",
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verA1Id,
        openings: 1,
        locations: [{ locationId: locationA1_1Id, openings: 1 }],
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) throw new Error("createVacancy failed");
      const vacId = createRes.value.id;

      // Fire two concurrent publication requests simultaneously against PostgreSQL
      const [res1, res2] = await Promise.all([
        publishVacancy(authA, { vacancyId: vacId }),
        publishVacancy(authA, { vacancyId: vacId }),
      ]);

      // Exactly one must succeed, and exactly one must fail closed
      const successCount = (res1.ok ? 1 : 0) + (res2.ok ? 1 : 0);
      const failCount = (!res1.ok ? 1 : 0) + (!res2.ok ? 1 : 0);

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      const failedRes = !res1.ok ? res1 : res2;
      if (!failedRes.ok) {
        expect(failedRes.error.code).toBe("VACANCY_ALREADY_PUBLISHED");
      }

      // Verify PostgreSQL state: exactly 1 transition occurred
      const dbRow = await prisma.vacancy.findUnique({
        where: { id: vacId },
      });
      expect(dbRow?.status).toBe("PUBLISHED");
      expect(dbRow?.publishedAt).not.toBeNull();
    });
  });
});
