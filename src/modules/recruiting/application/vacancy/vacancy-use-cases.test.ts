import { describe, it, expect, beforeEach } from "vitest";
import { createVacancyUseCase } from "./create-vacancy";
import { publishVacancyUseCase } from "./publish-vacancy";
import type {
  VacancyRepositoryPort,
  CreateVacancyData,
  PipelineVersionStatus,
} from "./ports/vacancy-repository";
import type {
  VacancyRecord,
  VacancyLocationRecord,
} from "./vacancy.types";
import type { AuthenticatedContext } from "@/modules/organization/public";

class InMemoryVacancyRepository implements VacancyRepositoryPort {
  public vacancies: Map<string, VacancyRecord> = new Map();
  public validDepartments: Set<string> = new Set();
  public validLegalEntities: Set<string> = new Set();
  public validLocations: Map<string, string> = new Map(); // locationId -> legalEntityId
  public pipelineVersions: Map<string, { id: string; status: PipelineVersionStatus }> = new Map();
  public failNextConditionalUpdate = false;

  async findVacancyById(tenantId: string, id: string): Promise<VacancyRecord | null> {
    const v = this.vacancies.get(id);
    if (!v || v.tenantId !== tenantId) {
      return null;
    }
    return v;
  }

  async findVacancyBySlug(tenantId: string, slug: string): Promise<VacancyRecord | null> {
    for (const v of this.vacancies.values()) {
      if (v.tenantId === tenantId && v.slug === slug) {
        return v;
      }
    }
    return null;
  }

  async checkDepartmentExistsInTenant(tenantId: string, departmentId: string): Promise<boolean> {
    return this.validDepartments.has(`${tenantId}:${departmentId}`);
  }

  async checkLegalEntityExistsInTenant(tenantId: string, legalEntityId: string): Promise<boolean> {
    return this.validLegalEntities.has(`${tenantId}:${legalEntityId}`);
  }

  async checkLocationBelongsToLegalEntityAndTenant(
    tenantId: string,
    legalEntityId: string,
    locationId: string
  ): Promise<boolean> {
    const expectedLe = this.validLocations.get(`${tenantId}:${locationId}`);
    return expectedLe === legalEntityId;
  }

  async findPipelineVersion(
    tenantId: string,
    pipelineVersionId: string
  ): Promise<{ id: string; status: PipelineVersionStatus } | null> {
    return this.pipelineVersions.get(`${tenantId}:${pipelineVersionId}`) ?? null;
  }

  async createVacancyWithLocations(data: CreateVacancyData): Promise<VacancyRecord> {
    const id = `vac_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const locations: VacancyLocationRecord[] = data.locations.map((loc) => ({
      id: `vl_${Math.random().toString(36).substring(2, 9)}`,
      tenantId: data.tenantId,
      vacancyId: id,
      legalEntityId: data.legalEntityId,
      locationId: loc.locationId,
      openings: loc.openings,
      createdAt: now,
    }));

    const vacancy: VacancyRecord = {
      id,
      tenantId: data.tenantId,
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      departmentId: data.departmentId,
      legalEntityId: data.legalEntityId,
      pipelineVersionId: data.pipelineVersionId,
      employmentType: data.employmentType ?? null,
      isRemote: data.isRemote ?? false,
      openings: data.openings,
      status: "DRAFT",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      locations,
    };

    this.vacancies.set(id, vacancy);
    return vacancy;
  }

  async publishVacancy(
    tenantId: string,
    vacancyId: string,
    publishedAt: Date
  ): Promise<VacancyRecord | null> {
    if (this.failNextConditionalUpdate) {
      return null;
    }
    const v = this.vacancies.get(vacancyId);
    if (!v || v.tenantId !== tenantId || v.status !== "DRAFT") {
      return null;
    }

    const updated: VacancyRecord = {
      ...v,
      status: "PUBLISHED",
      publishedAt,
      updatedAt: publishedAt,
    };
    this.vacancies.set(vacancyId, updated);
    return updated;
  }
}

describe("Vacancy Use Cases (Unit Tests)", () => {
  const tenantId = "tenant_test_100";
  let repo: InMemoryVacancyRepository;

  const validAuth: AuthenticatedContext = {
    actor: {
      userId: "usr_recruiter",
      email: "recruiter@hospital.com",
      name: "Lead Recruiter",
    },
    tenant: {
      tenantId,
      slug: "ama-hospital",
      name: "AMA Hospital",
    },
    membership: {
      membershipId: "mem_100",
    },
    roles: ["RECRUITER"],
    permissions: ["vacancy.create", "vacancy.publish"],
  };

  const noPermissionAuth: AuthenticatedContext = {
    ...validAuth,
    permissions: [],
  };

  const deptId = "dept_nurse";
  const legalEntityId = "le_anahuac";
  const location1Id = "loc_anahuac_main";
  const location2Id = "loc_anahuac_ped";
  const pipelineVersionId = "pip_v1";

  beforeEach(() => {
    repo = new InMemoryVacancyRepository();
    repo.validDepartments.add(`${tenantId}:${deptId}`);
    repo.validLegalEntities.add(`${tenantId}:${legalEntityId}`);
    repo.validLocations.set(`${tenantId}:${location1Id}`, legalEntityId);
    repo.validLocations.set(`${tenantId}:${location2Id}`, legalEntityId);
    repo.pipelineVersions.set(`${tenantId}:${pipelineVersionId}`, {
      id: pipelineVersionId,
      status: "PUBLISHED",
    });
  });

  describe("createVacancyUseCase", () => {
    it("fails closed with FORBIDDEN if actor lacks vacancy.create permission", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(noPermissionAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 2,
        locations: [{ locationId: location1Id, openings: 2 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("fails with INVALID_VACANCY_TITLE if title is empty or invalid", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "   ",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_VACANCY_TITLE");
      }
    });

    it("fails with INVALID_VACANCY_SLUG if slug is blank or whitespace", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "   ",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_VACANCY_SLUG");
      }
    });

    it("fails with VACANCY_LOCATION_ALLOCATION_MISMATCH if sum of location openings != total openings", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 5,
        locations: [{ locationId: location1Id, openings: 3 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_LOCATION_ALLOCATION_MISMATCH");
      }
    });

    it("fails with VACANCY_SLUG_ALREADY_EXISTS if slug is already used in tenant", async () => {
      await repo.createVacancyWithLocations({
        tenantId,
        title: "Existing Job",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General 2",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_SLUG_ALREADY_EXISTS");
      }
    });

    it("fails with DEPARTMENT_NOT_FOUND if department does not exist in tenant", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: "missing_dept",
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DEPARTMENT_NOT_FOUND");
      }
    });

    it("fails with LEGAL_ENTITY_NOT_FOUND if legal entity does not exist in tenant", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: "missing_le",
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("LEGAL_ENTITY_NOT_FOUND");
      }
    });

    it("fails with LOCATION_NOT_FOUND if location does not exist in tenant", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: "missing_loc", openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("LOCATION_NOT_FOUND");
      }
    });

    it("fails with LOCATION_NOT_FOUND if location belongs to a different legal entity", async () => {
      // Register location under a different legal entity
      repo.validLocations.set(`${tenantId}:loc_diff_le`, "le_apodaca");

      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: "loc_diff_le", openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("LOCATION_NOT_FOUND");
      }
    });

    it("fails with PIPELINE_VERSION_NOT_FOUND if pipeline version does not exist in tenant", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: "missing_pipe",
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });

    it("fails with PIPELINE_VERSION_NOT_PUBLISHED if pipeline version is DRAFT", async () => {
      repo.pipelineVersions.set(`${tenantId}:draft_pipe`, {
        id: "draft_pipe",
        status: "DRAFT",
      });

      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: "draft_pipe",
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PIPELINE_VERSION_NOT_PUBLISHED");
      }
    });

    it("successfully creates a DRAFT Vacancy with multi-location headcount allocation", async () => {
      const locations = [
        { locationId: location1Id, openings: 3 },
        { locationId: location2Id, openings: 2 },
      ];

      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 5,
        locations,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Enfermera General");
        expect(result.value.slug).toBe("enfermera-general");
        expect(result.value.status).toBe("DRAFT");
        expect(result.value.publishedAt).toBeNull();
        expect(result.value.openings).toBe(5);
        expect(result.value.pipelineVersionId).toBe(pipelineVersionId);
        expect(result.value.locations).toHaveLength(2);
        expect(result.value.locations[0].openings).toBe(3);
        expect(result.value.locations[1].openings).toBe(2);
      }
    });

    it("omitted employmentType results in null employmentType in VacancyRecord", async () => {
      const execute = createVacancyUseCase(repo);
      const result = await execute(validAuth, {
        title: "Médico General",
        slug: "medico-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        // employmentType omitted
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.employmentType).toBeNull();
      }
    });
  });

  describe("publishVacancyUseCase", () => {
    it("fails closed with FORBIDDEN if actor lacks vacancy.publish permission", async () => {
      const execute = publishVacancyUseCase(repo);
      const result = await execute(noPermissionAuth, { vacancyId: "any_vac" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("fails with VACANCY_NOT_FOUND if vacancy does not exist in tenant", async () => {
      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: "nonexistent_vac" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_NOT_FOUND");
      }
    });

    it("fails with VACANCY_ALREADY_PUBLISHED if vacancy is already PUBLISHED", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Already Published Vacancy",
        slug: "already-published",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      // Directly publish it in repo
      await repo.publishVacancy(tenantId, created.id, new Date());

      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: created.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_ALREADY_PUBLISHED");
      }
    });

    it("fails with VACANCY_LOCATION_ALLOCATION_MISMATCH if snapshot invariant is corrupted", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Corrupt Vacancy",
        slug: "corrupt-vac",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 2,
        locations: [{ locationId: location1Id, openings: 2 }],
      });

      // Corrupt snapshot openings in memory
      repo.vacancies.set(created.id, {
        ...repo.vacancies.get(created.id)!,
        openings: 5, // Sum of locations is 2 != 5
      });

      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: created.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VACANCY_LOCATION_ALLOCATION_MISMATCH");
      }
    });

    it("fails with PIPELINE_VERSION_NOT_PUBLISHED if pinned pipeline version is DRAFT", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Job with Draft Pipeline",
        slug: "job-draft-pipe",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      // Pipeline version is DRAFT (not published)
      repo.pipelineVersions.set(`${tenantId}:${pipelineVersionId}`, {
        id: pipelineVersionId,
        status: "DRAFT",
      });

      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: created.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PIPELINE_VERSION_NOT_PUBLISHED");
      }
    });

    it("successfully publishes a DRAFT vacancy and sets publishedAt", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Enfermera General",
        slug: "enfermera-general",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: created.id });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(created.id);
        expect(result.value.status).toBe("PUBLISHED");
        expect(result.value.publishedAt).not.toBeNull();
      }
    });

    it("prevents double publication and fails closed on concurrent transition", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Race Condition Test",
        slug: "race-condition",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      const execute = publishVacancyUseCase(repo);

      // First publication succeeds
      const firstResult = await execute(validAuth, { vacancyId: created.id });
      expect(firstResult.ok).toBe(true);

      // Second publication fails closed with VACANCY_ALREADY_PUBLISHED
      const secondResult = await execute(validAuth, { vacancyId: created.id });
      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.error.code).toBe("VACANCY_ALREADY_PUBLISHED");
      }
    });

    it("handles race condition where status changed between initial read and atomic update", async () => {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        title: "Mid-flight State Change",
        slug: "mid-flight",
        departmentId: deptId,
        legalEntityId: legalEntityId,
        pipelineVersionId: pipelineVersionId,
        employmentType: "FULL_TIME",
        openings: 1,
        locations: [{ locationId: location1Id, openings: 1 }],
      });

      // Simulate conditional update failure (e.g. concurrent worker modified the record)
      repo.failNextConditionalUpdate = true;

      const execute = publishVacancyUseCase(repo);
      const result = await execute(validAuth, { vacancyId: created.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Fails closed because conditional atomic update returned 0 rows
        expect(["VACANCY_ALREADY_PUBLISHED", "VACANCY_NOT_DRAFT"]).toContain(result.error.code);
      }
    });
  });
});
