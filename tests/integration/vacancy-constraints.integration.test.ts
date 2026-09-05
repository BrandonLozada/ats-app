import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { Prisma } from "@/generated/prisma/client";

describe("Vacancy & VacancyLocation & HiringTeamMember Constraints Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "91000000-0000-4000-d000-000000000001";
  const tenantBId = "91000000-0000-4000-d000-000000000002";

  const userAId = "91000000-0000-4000-d000-000000000011";
  const userBId = "91000000-0000-4000-d000-000000000012";

  const legalEntityA1Id = "91000000-0000-4000-d000-000000000021";
  const legalEntityA2Id = "91000000-0000-4000-d000-000000000022";
  const legalEntityB1Id = "91000000-0000-4000-d000-000000000023";

  const locationA1_1Id = "91000000-0000-4000-d000-000000000031";
  const locationA1_2Id = "91000000-0000-4000-d000-000000000034";
  const locationA2_1Id = "91000000-0000-4000-d000-000000000032";
  const locationB1_1Id = "91000000-0000-4000-d000-000000000033";

  const departmentAId = "91000000-0000-4000-d000-000000000041";
  const departmentBId = "91000000-0000-4000-d000-000000000042";

  const pipeAId = "91000000-0000-4000-d000-000000000051";
  const pipeBId = "91000000-0000-4000-d000-000000000052";

  const verAId = "91000000-0000-4000-d000-000000000061";
  const verBId = "91000000-0000-4000-d000-000000000062";

  const membershipAId = "91000000-0000-4000-d000-000000000071";
  const membershipBId = "91000000-0000-4000-d000-000000000072";

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
    await prisma.pipelineStage.deleteMany({
      where: { pipelineVersionId: { in: [verAId, verBId] } },
    });
    await prisma.pipelineVersion.deleteMany({
      where: { id: { in: [verAId, verBId] } },
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
        { id: tenantAId, slug: "tenant-vac-a", name: "Tenant Vacancy A" },
        { id: tenantBId, slug: "tenant-vac-b", name: "Tenant Vacancy B" },
      ],
    });

    // 2. Users
    await prisma.user.createMany({
      data: [
        { id: userAId, email: "user_vac_a@test.com", name: "User Vac A" },
        { id: userBId, email: "user_vac_b@test.com", name: "User Vac B" },
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
        { id: legalEntityA1Id, tenantId: tenantAId, name: "LegalEntity A1", code: "LEA1" },
        { id: legalEntityA2Id, tenantId: tenantAId, name: "LegalEntity A2", code: "LEA2" },
        { id: legalEntityB1Id, tenantId: tenantBId, name: "LegalEntity B1", code: "LEB1" },
      ],
    });

    // 5. Locations
    await prisma.location.createMany({
      data: [
        { id: locationA1_1Id, tenantId: tenantAId, legalEntityId: legalEntityA1Id, name: "Location A1.1" },
        { id: locationA1_2Id, tenantId: tenantAId, legalEntityId: legalEntityA1Id, name: "Location A1.2" },
        { id: locationA2_1Id, tenantId: tenantAId, legalEntityId: legalEntityA2Id, name: "Location A2.1" },
        { id: locationB1_1Id, tenantId: tenantBId, legalEntityId: legalEntityB1Id, name: "Location B1.1" },
      ],
    });

    // 6. Departments
    await prisma.department.createMany({
      data: [
        { id: departmentAId, tenantId: tenantAId, name: "Department A", slug: "dept-a" },
        { id: departmentBId, tenantId: tenantBId, name: "Department B", slug: "dept-b" },
      ],
    });

    // 7. Pipelines & Versions
    await prisma.hiringPipeline.createMany({
      data: [
        { id: pipeAId, tenantId: tenantAId, name: "Pipeline A" },
        { id: pipeBId, tenantId: tenantBId, name: "Pipeline B" },
      ],
    });

    await prisma.pipelineVersion.createMany({
      data: [
        { id: verAId, tenantId: tenantAId, pipelineId: pipeAId, version: 1, status: "PUBLISHED" },
        { id: verBId, tenantId: tenantBId, pipelineId: pipeBId, version: 1, status: "PUBLISHED" },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  // --- 1. Vacancy Slug Tests ---
  it("enforces tenant-scoped slug: rejects duplicate slug in same tenant, allows same slug across tenants", async () => {
    // 1. Create vacancy in Tenant A
    const vA = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Enfermera General",
        slug: "enfermera-general",
        status: "DRAFT",
      },
    });
    expect(vA.id).toBeDefined();

    // 2. Same slug in Tenant B -> ALLOWED
    const vB = await prisma.vacancy.create({
      data: {
        tenantId: tenantBId,
        departmentId: departmentBId,
        legalEntityId: legalEntityB1Id,
        pipelineVersionId: verBId,
        title: "Enfermera General",
        slug: "enfermera-general",
        status: "DRAFT",
      },
    });
    expect(vB.id).toBeDefined();

    // 3. Duplicate slug in Tenant A -> REJECTED
    await expect(
      prisma.vacancy.create({
        data: {
          tenantId: tenantAId,
          departmentId: departmentAId,
          legalEntityId: legalEntityA1Id,
          pipelineVersionId: verAId,
          title: "Enfermera General Segundo Turno",
          slug: "enfermera-general",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  // --- 2. Department Isolation ---
  it("physically rejects Vacancy referencing Department of another tenant", async () => {
    await expect(
      prisma.vacancy.create({
        data: {
          tenantId: tenantAId,
          departmentId: departmentBId, // Cross-tenant!
          legalEntityId: legalEntityA1Id,
          pipelineVersionId: verAId,
          title: "Cross Dept Vacancy",
          slug: "cross-dept",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  // --- 3. LegalEntity Isolation ---
  it("physically rejects Vacancy referencing LegalEntity of another tenant", async () => {
    await expect(
      prisma.vacancy.create({
        data: {
          tenantId: tenantAId,
          departmentId: departmentAId,
          legalEntityId: legalEntityB1Id, // Cross-tenant!
          pipelineVersionId: verAId,
          title: "Cross LegalEntity Vacancy",
          slug: "cross-le",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  // --- 4. PipelineVersion Isolation ---
  it("physically rejects Vacancy referencing PipelineVersion of another tenant", async () => {
    await expect(
      prisma.vacancy.create({
        data: {
          tenantId: tenantAId,
          departmentId: departmentAId,
          legalEntityId: legalEntityA1Id,
          pipelineVersionId: verBId, // Cross-tenant!
          title: "Cross Pipeline Vacancy",
          slug: "cross-pipe",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  // --- 5. VacancyLocation Tests ---
  it("enforces VacancyLocation rules: same tenant + same LegalEntity allowed; mismatched LegalEntity or Tenant rejected; duplicate rejected", async () => {
    const vacancy = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Médico Especialista",
        slug: "medico-especialista",
      },
    });

    // 1. Same tenant + same LegalEntity (locationA1_1 under legalEntityA1) -> ALLOWED
    const vl1 = await prisma.vacancyLocation.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vacancy.id,
        legalEntityId: legalEntityA1Id,
        locationId: locationA1_1Id,
        openings: 5,
      },
    });
    expect(vl1.id).toBeDefined();

    // 2. Duplicate Location on same Vacancy -> REJECTED
    await expect(
      prisma.vacancyLocation.create({
        data: {
          tenantId: tenantAId,
          vacancyId: vacancy.id,
          legalEntityId: legalEntityA1Id,
          locationId: locationA1_1Id,
          openings: 5,
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // 3. Same Tenant, but wrong LegalEntity (locationA2_1 belongs to legalEntityA2, but vacancy belongs to legalEntityA1) -> REJECTED
    await expect(
      prisma.vacancyLocation.create({
        data: {
          tenantId: tenantAId,
          vacancyId: vacancy.id,
          legalEntityId: legalEntityA1Id,
          locationId: locationA2_1Id, // Belongs to legalEntityA2!
          openings: 5,
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // 4. Cross-tenant Location (locationB1_1 belongs to tenantB) -> REJECTED
    await expect(
      prisma.vacancyLocation.create({
        data: {
          tenantId: tenantAId,
          vacancyId: vacancy.id,
          legalEntityId: legalEntityA1Id,
          locationId: locationB1_1Id, // Tenant B!
          openings: 5,
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  // --- 6. Headcount & Multi-Location Allocation Persistence Semantics ---
  it("persists total requested openings on Vacancy and per-location allocated openings across multiple Locations under the same LegalEntity", async () => {
    // Vacancy requesting total 5 openings
    const vacancy = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Enfermera Especialista",
        slug: "enfermera-especialista-headcount",
        openings: 5,
      },
    });
    expect(vacancy.openings).toBe(5);

    // Location A1.1 allocated 3 openings
    const vl1 = await prisma.vacancyLocation.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vacancy.id,
        legalEntityId: legalEntityA1Id,
        locationId: locationA1_1Id,
        openings: 3,
      },
    });
    expect(vl1.openings).toBe(3);

    // Location A1.2 allocated 2 openings (same LegalEntity)
    const vl2 = await prisma.vacancyLocation.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vacancy.id,
        legalEntityId: legalEntityA1Id,
        locationId: locationA1_2Id,
        openings: 2,
      },
    });
    expect(vl2.openings).toBe(2);

    // Query back from DB
    const persistedVacancy = await prisma.vacancy.findUniqueOrThrow({
      where: { id: vacancy.id },
      include: {
        locations: {
          orderBy: { openings: "desc" },
        },
      },
    });

    expect(persistedVacancy.openings).toBe(5);
    expect(persistedVacancy.locations).toHaveLength(2);
    expect(persistedVacancy.locations[0].locationId).toBe(locationA1_1Id);
    expect(persistedVacancy.locations[0].openings).toBe(3);
    expect(persistedVacancy.locations[1].locationId).toBe(locationA1_2Id);
    expect(persistedVacancy.locations[1].openings).toBe(2);

    // Sum of allocated openings matches requisition openings
    const allocatedSum = persistedVacancy.locations.reduce((sum, loc) => sum + loc.openings, 0);
    expect(allocatedSum).toBe(persistedVacancy.openings);
  });

  // --- 6. HiringTeamMember Tests ---
  it("enforces HiringTeamMember rules: same tenant allowed; cross-tenant rejected; duplicate membership on same vacancy rejected", async () => {
    const vacancy = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Paramédico",
        slug: "paramedico",
      },
    });

    // 1. Same tenant membership -> ALLOWED
    const member = await prisma.hiringTeamMember.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vacancy.id,
        tenantMembershipId: membershipAId,
        responsibility: "RECRUITER",
      },
    });
    expect(member.id).toBeDefined();
    expect(member.responsibility).toBe("RECRUITER");

    // 2. Duplicate assignment of same membership on same Vacancy -> REJECTED
    await expect(
      prisma.hiringTeamMember.create({
        data: {
          tenantId: tenantAId,
          vacancyId: vacancy.id,
          tenantMembershipId: membershipAId,
          responsibility: "HIRING_MANAGER",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // 3. Cross-tenant TenantMembership (membershipBId from tenantB) -> REJECTED
    await expect(
      prisma.hiringTeamMember.create({
        data: {
          tenantId: tenantAId,
          vacancyId: vacancy.id,
          tenantMembershipId: membershipBId,
          responsibility: "INTERVIEWER",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // 4. Same membership assigned to a different vacancy in same tenant -> ALLOWED
    const vacancy2 = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Paramédico Turno B",
        slug: "paramedico-turno-b",
      },
    });

    const member2 = await prisma.hiringTeamMember.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vacancy2.id,
        tenantMembershipId: membershipAId,
        responsibility: "HIRING_MANAGER",
      },
    });
    expect(member2.id).toBeDefined();
    expect(member2.responsibility).toBe("HIRING_MANAGER");
  });

  // --- 7. Deletion Semantics Tests ---
  it("enforces cascade and restrict delete behaviors", async () => {
    const vac = await prisma.vacancy.create({
      data: {
        tenantId: tenantAId,
        departmentId: departmentAId,
        legalEntityId: legalEntityA1Id,
        pipelineVersionId: verAId,
        title: "Recepcionista",
        slug: "recepcionista",
      },
    });

    const vl = await prisma.vacancyLocation.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vac.id,
        legalEntityId: legalEntityA1Id,
        locationId: locationA1_1Id,
        openings: 2,
      },
    });

    const htm = await prisma.hiringTeamMember.create({
      data: {
        tenantId: tenantAId,
        vacancyId: vac.id,
        tenantMembershipId: membershipAId,
        responsibility: "INTERVIEWER",
      },
    });

    // Restrict check: Cannot delete Location actively used by VacancyLocation
    await expect(
      prisma.location.delete({
        where: { id: locationA1_1Id },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // Restrict check: Cannot delete Department actively used by Vacancy
    await expect(
      prisma.department.delete({
        where: { id: departmentAId },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // Restrict check: Cannot delete PipelineVersion actively used by Vacancy
    await expect(
      prisma.pipelineVersion.delete({
        where: { id: verAId },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    // Cascade check: Deleting Vacancy cascades to VacancyLocation and HiringTeamMember
    await prisma.vacancy.delete({
      where: { id: vac.id },
    });

    const deletedVl = await prisma.vacancyLocation.findUnique({ where: { id: vl.id } });
    expect(deletedVl).toBeNull();

    const deletedHtm = await prisma.hiringTeamMember.findUnique({ where: { id: htm.id } });
    expect(deletedHtm).toBeNull();
  });
});
