import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  findPublishedVacancies,
  getPublicVacancyDetails,
} from "@/modules/recruiting/public.server";
import type { PublicTenantContext } from "@/modules/organization/public";

describe("Recruiting Vacancy Public Reads Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "94000000-0000-4000-d000-000000000001";
  const tenantBId = "94000000-0000-4000-d000-000000000002";

  const legalEntityAId = "94000000-0000-4000-d000-000000000011";
  const legalEntityBId = "94000000-0000-4000-d000-000000000012";

  const locationA1Id = "94000000-0000-4000-d000-000000000021";
  const locationA2Id = "94000000-0000-4000-d000-000000000022";
  const locationB1Id = "94000000-0000-4000-d000-000000000023";

  const departmentAId = "94000000-0000-4000-d000-000000000031";
  const departmentBId = "94000000-0000-4000-d000-000000000032";

  const pipelineAId = "94000000-0000-4000-d000-000000000041";
  const pipelineBId = "94000000-0000-4000-d000-000000000042";

  const versionAId = "94000000-0000-4000-d000-000000000051";
  const versionBId = "94000000-0000-4000-d000-000000000052";

  const vacancyAPubId = "94000000-0000-4000-d000-000000000061";
  const vacancyADraftId = "94000000-0000-4000-d000-000000000062";
  const vacancyAPausedId = "94000000-0000-4000-d000-000000000063";
  const vacancyAClosedId = "94000000-0000-4000-d000-000000000064";
  const vacancyANullPublishedAtId = "94000000-0000-4000-d000-000000000065";
  const vacancyBPubId = "94000000-0000-4000-d000-000000000066";

  const ctxA: PublicTenantContext = {
    tenantId: tenantAId,
    slug: "tenant-read-a",
    name: "Tenant Read A",
  };

  const ctxB: PublicTenantContext = {
    tenantId: tenantBId,
    slug: "tenant-read-b",
    name: "Tenant Read B",
  };

  async function cleanFixtures() {
    await prisma.vacancyLocation.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.vacancy.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.pipelineStage.deleteMany({
      where: {
        pipelineVersionId: { in: [versionAId, versionBId] },
      },
    });
    await prisma.pipelineVersion.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.hiringPipeline.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.location.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.legalEntity.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.department.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
  }

  beforeAll(async () => {
    await cleanFixtures();

    // 1. Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, name: "Tenant Read A", slug: "tenant-read-a" },
        { id: tenantBId, name: "Tenant Read B", slug: "tenant-read-b" },
      ],
    });

    // 2. Departments
    await prisma.department.createMany({
      data: [
        {
          id: departmentAId,
          tenantId: tenantAId,
          name: "Enfermería General",
          slug: "enfermeria-general",
        },
        {
          id: departmentBId,
          tenantId: tenantBId,
          name: "Cirugía",
          slug: "cirugia",
        },
      ],
    });

    // 3. Legal Entities
    await prisma.legalEntity.createMany({
      data: [
        {
          id: legalEntityAId,
          tenantId: tenantAId,
          name: "AMA Anáhuac S.A.",
          code: "AMA-ANH",
        },
        {
          id: legalEntityBId,
          tenantId: tenantBId,
          name: "Hospital San Pedro S.A.",
          code: "HSP",
        },
      ],
    });

    // 4. Locations
    await prisma.location.createMany({
      data: [
        {
          id: locationA1Id,
          tenantId: tenantAId,
          legalEntityId: legalEntityAId,
          name: "Campus Anáhuac",
          code: "ANH-1",
        },
        {
          id: locationA2Id,
          tenantId: tenantAId,
          legalEntityId: legalEntityAId,
          name: "Campus Apodaca",
          code: "APO-1",
        },
        {
          id: locationB1Id,
          tenantId: tenantBId,
          legalEntityId: legalEntityBId,
          name: "Campus San Pedro",
          code: "SP-1",
        },
      ],
    });

    // 5. Pipelines & Published Versions
    await prisma.hiringPipeline.createMany({
      data: [
        { id: pipelineAId, tenantId: tenantAId, name: "Default Pipeline A" },
        { id: pipelineBId, tenantId: tenantBId, name: "Default Pipeline B" },
      ],
    });

    await prisma.pipelineVersion.createMany({
      data: [
        {
          id: versionAId,
          tenantId: tenantAId,
          pipelineId: pipelineAId,
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-01T00:00:00Z"),
        },
        {
          id: versionBId,
          tenantId: tenantBId,
          pipelineId: pipelineBId,
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-01T00:00:00Z"),
        },
      ],
    });

    // 6. Vacancies in Tenant A
    // (a) 1 PUBLISHED with publishedAt set
    await prisma.vacancy.create({
      data: {
        id: vacancyAPubId,
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityAId,
        pipelineVersionId: versionAId,
        title: "Enfermera de Quirófano",
        slug: "enfermera-de-quirofano",
        description: "Especialista para cirugía ambulatoria.",
        employmentType: "FULL_TIME",
        isRemote: false,
        openings: 3,
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-05T12:00:00Z"),
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantAId,
          vacancyId: vacancyAPubId,
          legalEntityId: legalEntityAId,
          locationId: locationA1Id,
          openings: 2,
        },
        {
          tenantId: tenantAId,
          vacancyId: vacancyAPubId,
          legalEntityId: legalEntityAId,
          locationId: locationA2Id,
          openings: 1,
        },
      ],
    });

    // (b) 1 DRAFT
    await prisma.vacancy.create({
      data: {
        id: vacancyADraftId,
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityAId,
        pipelineVersionId: versionAId,
        title: "Médico Residente Draft",
        slug: "medico-residente-draft",
        description: "Borrador interno no visible.",
        employmentType: "CONTRACTOR",
        isRemote: false,
        openings: 1,
        status: "DRAFT",
        publishedAt: null,
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantAId,
          vacancyId: vacancyADraftId,
          legalEntityId: legalEntityAId,
          locationId: locationA1Id,
          openings: 1,
        },
      ],
    });

    // (c) 1 PAUSED
    await prisma.vacancy.create({
      data: {
        id: vacancyAPausedId,
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityAId,
        pipelineVersionId: versionAId,
        title: "Técnico Radiólogo Paused",
        slug: "tecnico-radiologo-paused",
        description: "Pausa temporal por presupuesto.",
        employmentType: "FULL_TIME",
        isRemote: false,
        openings: 1,
        status: "PAUSED",
        publishedAt: new Date("2026-08-20T10:00:00Z"),
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantAId,
          vacancyId: vacancyAPausedId,
          legalEntityId: legalEntityAId,
          locationId: locationA1Id,
          openings: 1,
        },
      ],
    });

    // (d) 1 CLOSED
    await prisma.vacancy.create({
      data: {
        id: vacancyAClosedId,
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityAId,
        pipelineVersionId: versionAId,
        title: "Camillero Closed",
        slug: "camillero-closed",
        description: "Posición cerrada.",
        employmentType: "PART_TIME",
        isRemote: false,
        openings: 1,
        status: "CLOSED",
        publishedAt: new Date("2026-08-01T10:00:00Z"),
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantAId,
          vacancyId: vacancyAClosedId,
          legalEntityId: legalEntityAId,
          locationId: locationA1Id,
          openings: 1,
        },
      ],
    });

    // (e) 1 PUBLISHED with publishedAt = null (historical/backfilled case)
    await prisma.vacancy.create({
      data: {
        id: vacancyANullPublishedAtId,
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityAId,
        pipelineVersionId: versionAId,
        title: "Médico de Urgencias Histórico",
        slug: "medico-de-urgencias-historico",
        description: "Posición histórica migrada.",
        employmentType: null,
        isRemote: true,
        openings: 1,
        status: "PUBLISHED",
        publishedAt: null,
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantAId,
          vacancyId: vacancyANullPublishedAtId,
          legalEntityId: legalEntityAId,
          locationId: locationA1Id,
          openings: 1,
        },
      ],
    });

    // 7. Vacancies in Tenant B
    // (a) 1 PUBLISHED
    await prisma.vacancy.create({
      data: {
        id: vacancyBPubId,
        tenantId: tenantBId,
        departmentId: departmentBId,
        legalEntityId: legalEntityBId,
        pipelineVersionId: versionBId,
        title: "Cirujano General",
        slug: "cirujano-general",
        description: "Cirujano con especialidad.",
        employmentType: "FULL_TIME",
        isRemote: false,
        openings: 2,
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-04T12:00:00Z"),
      },
    });
    await prisma.vacancyLocation.createMany({
      data: [
        {
          tenantId: tenantBId,
          vacancyId: vacancyBPubId,
          legalEntityId: legalEntityBId,
          locationId: locationB1Id,
          openings: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanFixtures();
  });

  describe("Listing Isolation & Deterministic Ordering", () => {
    it("findPublishedVacancies(ctxA) returns only PUBLISHED vacancies for Tenant A", async () => {
      const result = await findPublishedVacancies(ctxA);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Exactly 2 published vacancies in Tenant A: "enfermera-de-quirofano" and "medico-de-urgencias-historico"
      expect(result.value).toHaveLength(2);

      const slugs = result.value.map((v) => v.slug);
      expect(slugs).toContain("enfermera-de-quirofano");
      expect(slugs).toContain("medico-de-urgencias-historico");

      // Verify hidden states are excluded
      expect(slugs).not.toContain("medico-residente-draft");
      expect(slugs).not.toContain("tecnico-radiologo-paused");
      expect(slugs).not.toContain("camillero-closed");

      // Verify cross-tenant vacancies are excluded
      expect(slugs).not.toContain("cirujano-general");

      // Verify deterministic ordering: publishedAt DESC nulls last
      expect(result.value[0].slug).toBe("enfermera-de-quirofano");
      expect(result.value[1].slug).toBe("medico-de-urgencias-historico");
    });

    it("findPublishedVacancies(ctxB) returns only PUBLISHED vacancies for Tenant B", async () => {
      const result = await findPublishedVacancies(ctxB);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      expect(result.value[0].slug).toBe("cirujano-general");
      expect(result.value[0].title).toBe("Cirujano General");
      expect(result.value[0].department.name).toBe("Cirugía");
      expect(result.value[0].legalEntity.name).toBe("Hospital San Pedro S.A.");
      expect(result.value[0].locations[0].name).toBe("Campus San Pedro");
    });

    it("findPublishedVacancies returns empty array for tenant with no vacancies", async () => {
      const emptyCtx: PublicTenantContext = {
        tenantId: "94000000-0000-4000-d000-000000000099",
        slug: "empty-tenant",
        name: "Empty Tenant",
      };

      const result = await findPublishedVacancies(emptyCtx);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual([]);
    });

    it("proves a PUBLISHED vacancy with publishedAt = null is still returned", async () => {
      const result = await findPublishedVacancies(ctxA);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const nullPublishedAtVac = result.value.find(
        (v) => v.slug === "medico-de-urgencias-historico"
      );
      expect(nullPublishedAtVac).toBeDefined();
      expect(nullPublishedAtVac?.publishedAt).toBeNull();
      expect(nullPublishedAtVac?.openings).toBe(1);
      expect(nullPublishedAtVac?.isRemote).toBe(true);
    });
  });

  describe("Detail Isolation & Hidden States", () => {
    it("getPublicVacancyDetails(ctxA) returns published vacancy by slug", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "enfermera-de-quirofano",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id).toBe(vacancyAPubId);
      expect(result.value.slug).toBe("enfermera-de-quirofano");
      expect(result.value.title).toBe("Enfermera de Quirófano");
      expect(result.value.description).toBe("Especialista para cirugía ambulatoria.");
      expect(result.value.employmentType).toBe("FULL_TIME");
      expect(result.value.isRemote).toBe(false);
      expect(result.value.openings).toBe(3);
      expect(result.value.department).toEqual({
        id: departmentAId,
        name: "Enfermería General",
      });
      expect(result.value.legalEntity).toEqual({
        id: legalEntityAId,
        name: "AMA Anáhuac S.A.",
      });
      expect(result.value.locations).toHaveLength(2);
      expect(result.value.locations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: locationA1Id,
            name: "Campus Anáhuac",
            openings: 2,
          }),
          expect.objectContaining({
            id: locationA2Id,
            name: "Campus Apodaca",
            openings: 1,
          }),
        ])
      );
    });

    it("getPublicVacancyDetails returns VACANCY_NOT_FOUND when slug belongs to another tenant", async () => {
      // ctxA requests Tenant B's published vacancy slug
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "cirujano-general",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("getPublicVacancyDetails returns VACANCY_NOT_FOUND when slug is DRAFT", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "medico-residente-draft",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("getPublicVacancyDetails returns VACANCY_NOT_FOUND when slug is PAUSED", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "tecnico-radiologo-paused",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("getPublicVacancyDetails returns VACANCY_NOT_FOUND when slug is CLOSED", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "camillero-closed",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("getPublicVacancyDetails returns VACANCY_NOT_FOUND for non-existent slug", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "non-existent-vacancy-slug",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("getPublicVacancyDetails returns published vacancy with publishedAt = null", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "medico-de-urgencias-historico",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id).toBe(vacancyANullPublishedAtId);
      expect(result.value.publishedAt).toBeNull();
      expect(result.value.openings).toBe(1);
    });
  });

  describe("Projection Security", () => {
    it("ensures public vacancy listing does not expose internal recruiting fields", async () => {
      const result = await findPublishedVacancies(ctxA);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      for (const item of result.value) {
        const anyItem = item as Record<string, unknown>;
        expect(anyItem.tenantId).toBeUndefined();
        expect(anyItem.pipelineVersionId).toBeUndefined();
        expect(anyItem.pipelineVersion).toBeUndefined();
        expect(anyItem.hiringTeamMembers).toBeUndefined();
        expect(anyItem.hiringTeam).toBeUndefined();
        expect(anyItem.tenantMembershipId).toBeUndefined();
        expect(anyItem.status).toBeUndefined();
        expect(anyItem.createdAt).toBeUndefined();
        expect(anyItem.updatedAt).toBeUndefined();
      }
    });

    it("ensures public vacancy details does not expose internal recruiting fields", async () => {
      const result = await getPublicVacancyDetails(ctxA, {
        slug: "enfermera-de-quirofano",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const anyDetails = result.value as unknown as Record<string, unknown>;
      expect(anyDetails.tenantId).toBeUndefined();
      expect(anyDetails.pipelineVersionId).toBeUndefined();
      expect(anyDetails.pipelineVersion).toBeUndefined();
      expect(anyDetails.hiringTeamMembers).toBeUndefined();
      expect(anyDetails.hiringTeam).toBeUndefined();
      expect(anyDetails.tenantMembershipId).toBeUndefined();
      expect(anyDetails.status).toBeUndefined();
      expect(anyDetails.createdAt).toBeUndefined();
      expect(anyDetails.updatedAt).toBeUndefined();
    });
  });

  describe("Live Historical Migrated Vacancy", () => {
    it("successfully reads the historical migrated Enfermera General vacancy anonymously", async () => {
      const amaCtx: PublicTenantContext = {
        tenantId: "e6759b00-099e-443a-8aa5-2bfc67b191ea",
        slug: "ama",
        name: "AMA",
      };

      const result = await getPublicVacancyDetails(amaCtx, {
        slug: "enfermera-general",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id).toBe("255b4499-7552-4bc5-b395-c6cdc7bc108a");
      expect(result.value.slug).toBe("enfermera-general");
      expect(result.value.title).toBe("Enfermera General");
      expect(result.value.openings).toBe(1);
      expect(result.value.publishedAt).toBeNull();
      expect(result.value.legalEntity.name).toBe("AMA Anáhuac");
      expect(result.value.locations).toHaveLength(1);
      expect(result.value.locations[0].name).toBe("Anáhuac");
      expect(result.value.locations[0].openings).toBe(1);
    });
  });
});
