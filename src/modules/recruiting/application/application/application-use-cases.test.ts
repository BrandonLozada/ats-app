import { describe, it, expect } from "vitest";
import { createApplicationUseCase } from "./create-application";
import type {
  ApplicationRepositoryPort,
  CandidateForApplication,
  VacancyForApplication,
  InitialStageForVacancy,
  CreateApplicationData,
} from "./ports/application-repository";
import { ApplicationAlreadyActiveException } from "./ports/application-repository";
import type { ApplicationRecord } from "./application.types";
import type { AuthenticatedContext } from "@/modules/organization/public";

class FakeApplicationRepository implements ApplicationRepositoryPort {
  candidates: Map<string, CandidateForApplication> = new Map();
  vacancies: Map<string, VacancyForApplication> = new Map();
  stages: Map<string, InitialStageForVacancy[]> = new Map();
  locations: Set<string> = new Set();
  sources: Set<string> = new Set();
  activeApplications: Map<string, ApplicationRecord> = new Map();
  createdApplications: ApplicationRecord[] = [];

  simulateUniqueViolationOnCreate = false;
  simulateGenericErrorOnCreate = false;

  throwOnFindCandidate?: Error;
  throwOnFindVacancy?: Error;
  throwOnFindInitialStages?: Error;
  throwOnCheckVacancyLocation?: Error;
  throwOnCheckApplicationSource?: Error;
  throwOnFindActiveApplication?: Error;
  throwOnCreate?: Error;

  async findCandidateInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateForApplication | null> {
    if (this.throwOnFindCandidate) {
      throw this.throwOnFindCandidate;
    }
    const key = `${tenantId}:${candidateId}`;
    return this.candidates.get(key) || null;
  }

  async findVacancyForApplication(
    tenantId: string,
    vacancyId: string
  ): Promise<VacancyForApplication | null> {
    if (this.throwOnFindVacancy) {
      throw this.throwOnFindVacancy;
    }
    const key = `${tenantId}:${vacancyId}`;
    return this.vacancies.get(key) || null;
  }

  async findInitialStagesForPipelineVersion(
    pipelineVersionId: string
  ): Promise<readonly InitialStageForVacancy[]> {
    if (this.throwOnFindInitialStages) {
      throw this.throwOnFindInitialStages;
    }
    return this.stages.get(pipelineVersionId) || [];
  }

  async checkVacancyLocationBelongsToVacancyAndTenant(
    tenantId: string,
    vacancyId: string,
    locationId: string
  ): Promise<boolean> {
    if (this.throwOnCheckVacancyLocation) {
      throw this.throwOnCheckVacancyLocation;
    }
    const key = `${tenantId}:${vacancyId}:${locationId}`;
    return this.locations.has(key);
  }

  async checkApplicationSourceExists(sourceId: string): Promise<boolean> {
    if (this.throwOnCheckApplicationSource) {
      throw this.throwOnCheckApplicationSource;
    }
    return this.sources.has(sourceId);
  }

  async findActiveApplication(
    tenantId: string,
    candidateId: string,
    vacancyId: string
  ): Promise<ApplicationRecord | null> {
    if (this.throwOnFindActiveApplication) {
      throw this.throwOnFindActiveApplication;
    }
    const key = `${tenantId}:${candidateId}:${vacancyId}`;
    return this.activeApplications.get(key) || null;
  }

  async createApplicationWithInitialHistory(
    data: CreateApplicationData
  ): Promise<ApplicationRecord> {
    if (this.simulateUniqueViolationOnCreate) {
      throw new ApplicationAlreadyActiveException(
        "An active application already exists for this candidate and vacancy."
      );
    }
    if (this.simulateGenericErrorOnCreate || this.throwOnCreate) {
      throw this.throwOnCreate || new Error("Database connection failure");
    }

    const app: ApplicationRecord = {
      id: "98300000-0000-4000-b000-000000000001",
      tenantId: data.tenantId,
      candidateId: data.candidateId,
      vacancyId: data.vacancyId,
      currentStageId: data.currentStageId,
      outcome: "NONE",
      assignedVacancyLocationId: data.assignedVacancyLocationId,
      sourceId: data.sourceId,
      appliedAt: new Date(),
      notes: data.notes ?? null,
      createdById: data.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.createdApplications.push(app);
    return app;
  }
}

describe("Application Use Cases (Unit Tests with In-Memory Fake)", () => {
  const tenantId = "98300000-0000-4000-a000-000000000001";
  const actorUserId = "98300000-0000-4000-a000-000000000002";
  const candidateId = "98300000-0000-4000-a000-000000000010";
  const vacancyId = "98300000-0000-4000-a000-000000000020";
  const pipelineVersionId = "98300000-0000-4000-a000-000000000030";
  const initialStageId = "98300000-0000-4000-a000-000000000040";
  const locationId = "98300000-0000-4000-a000-000000000050";
  const sourceId = "98300000-0000-4000-a000-000000000060";

  function createValidContext(permissions = ["application.create"]): AuthenticatedContext {
    return {
      actor: {
        userId: actorUserId,
        email: "recruiter@ama.test",
        name: "Test Recruiter",
      },
      tenant: {
        tenantId,
        slug: "ama-hospital",
        name: "AMA Hospital",
      },
      membership: {
        membershipId: "98300000-0000-4000-a000-000000000003",
      },
      roles: ["recruiter"],
      permissions,
    };
  }

  function setupValidRepo(): FakeApplicationRepository {
    const repo = new FakeApplicationRepository();
    repo.candidates.set(`${tenantId}:${candidateId}`, { id: candidateId, tenantId });
    repo.vacancies.set(`${tenantId}:${vacancyId}`, {
      id: vacancyId,
      tenantId,
      status: "PUBLISHED",
      pipelineVersionId,
    });
    repo.stages.set(pipelineVersionId, [
      {
        id: initialStageId,
        pipelineVersionId,
        category: "APPLIED",
        isInitial: true,
      },
    ]);
    repo.locations.add(`${tenantId}:${vacancyId}:${locationId}`);
    repo.sources.add(sourceId);
    return repo;
  }

  it("fails closed with FORBIDDEN if permission application.create is missing", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext([]); // No permissions

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toContain("application.create");
    }
  });

  it("fails closed with APPLICATION_CANDIDATE_NOT_FOUND when candidate does not exist in tenant", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const nonExistentCandidate = "98300000-0000-4000-a000-999999999999";
    const result = await useCase(ctx, { candidateId: nonExistentCandidate, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("APPLICATION_CANDIDATE_NOT_FOUND");
    }
  });

  it("fails closed with APPLICATION_VACANCY_NOT_FOUND when vacancy does not exist in tenant", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const nonExistentVacancy = "98300000-0000-4000-a000-999999999999";
    const result = await useCase(ctx, { candidateId, vacancyId: nonExistentVacancy });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("APPLICATION_VACANCY_NOT_FOUND");
    }
  });

  it("rejects application when Vacancy status is DRAFT", async () => {
    const repo = setupValidRepo();
    repo.vacancies.set(`${tenantId}:${vacancyId}`, {
      id: vacancyId,
      tenantId,
      status: "DRAFT",
      pipelineVersionId,
    });
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
    }
  });

  it("rejects application when Vacancy status is PAUSED", async () => {
    const repo = setupValidRepo();
    repo.vacancies.set(`${tenantId}:${vacancyId}`, {
      id: vacancyId,
      tenantId,
      status: "PAUSED",
      pipelineVersionId,
    });
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
    }
  });

  it("rejects application when Vacancy status is CLOSED", async () => {
    const repo = setupValidRepo();
    repo.vacancies.set(`${tenantId}:${vacancyId}`, {
      id: vacancyId,
      tenantId,
      status: "CLOSED",
      pipelineVersionId,
    });
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VACANCY_NOT_ACCEPTING_APPLICATIONS");
    }
  });

  it("fails closed with INITIAL_STAGE_NOT_FOUND if pipeline version has 0 initial stages", async () => {
    const repo = setupValidRepo();
    repo.stages.set(pipelineVersionId, []);
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INITIAL_STAGE_NOT_FOUND");
    }
  });

  it("fails closed with PIPELINE_CONFIGURATION_ERROR if pipeline version has multiple initial stages", async () => {
    const repo = setupValidRepo();
    repo.stages.set(pipelineVersionId, [
      { id: initialStageId, pipelineVersionId, category: "APPLIED", isInitial: true },
      { id: "98300000-0000-4000-a000-000000000041", pipelineVersionId, category: "APPLIED", isInitial: true },
    ]);
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PIPELINE_CONFIGURATION_ERROR");
    }
  });

  it("fails closed with PIPELINE_CONFIGURATION_ERROR if initial stage category is not APPLIED", async () => {
    const repo = setupValidRepo();
    repo.stages.set(pipelineVersionId, [
      { id: initialStageId, pipelineVersionId, category: "SCREENING", isInitial: true },
    ]);
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PIPELINE_CONFIGURATION_ERROR");
      expect(result.error.message).toContain("APPLIED");
    }
  });

  it("fails closed with VACANCY_LOCATION_NOT_FOUND if assigned location does not belong to vacancy", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const foreignLocationId = "98300000-0000-4000-a000-000000000059";
    const result = await useCase(ctx, {
      candidateId,
      vacancyId,
      assignedVacancyLocationId: foreignLocationId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VACANCY_LOCATION_NOT_FOUND");
    }
  });

  it("fails closed with APPLICATION_SOURCE_NOT_FOUND if source does not exist", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const nonExistentSource = "98300000-0000-4000-a000-000000000069";
    const result = await useCase(ctx, {
      candidateId,
      vacancyId,
      sourceId: nonExistentSource,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("APPLICATION_SOURCE_NOT_FOUND");
    }
  });

  it("fails closed with APPLICATION_ALREADY_ACTIVE when active application exists in precheck", async () => {
    const repo = setupValidRepo();
    repo.activeApplications.set(`${tenantId}:${candidateId}:${vacancyId}`, {
      id: "98300000-0000-4000-b000-000000000099",
      tenantId,
      candidateId,
      vacancyId,
      currentStageId: initialStageId,
      outcome: "NONE",
      assignedVacancyLocationId: null,
      sourceId: null,
      appliedAt: new Date(),
      createdById: actorUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("APPLICATION_ALREADY_ACTIVE");
    }
  });

  it("maps database race unique violation to APPLICATION_ALREADY_ACTIVE", async () => {
    const repo = setupValidRepo();
    repo.simulateUniqueViolationOnCreate = true;
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, { candidateId, vacancyId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("APPLICATION_ALREADY_ACTIVE");
    }
  });

  describe("Repository Error Boundary & Failure Sanitization", () => {
    const sensitiveError = new Error(
      "postgres://secret-user:secret-password@localhost/ats"
    );

    it("sanitizes candidate lookup repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnFindCandidate = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, { candidateId, vacancyId });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes vacancy lookup repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnFindVacancy = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, { candidateId, vacancyId });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes initial stage lookup repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnFindInitialStages = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, { candidateId, vacancyId });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes vacancy location check repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnCheckVacancyLocation = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, {
        candidateId,
        vacancyId,
        assignedVacancyLocationId: locationId,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes application source check repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnCheckApplicationSource = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, {
        candidateId,
        vacancyId,
        sourceId,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes active application precheck repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnFindActiveApplication = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, { candidateId, vacancyId });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });

    it("sanitizes create repository error without leaking internal details", async () => {
      const repo = setupValidRepo();
      repo.throwOnCreate = sensitiveError;
      const useCase = createApplicationUseCase(repo);
      const ctx = createValidContext();

      const result = await useCase(ctx, { candidateId, vacancyId });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("secret-user");
        expect(result.error.message).not.toContain("secret-password");
        expect(result.error.message).not.toContain("postgres://");
      }
    });
  });

  it("successfully creates Application with canonical fields and initial stage", async () => {
    const repo = setupValidRepo();
    const useCase = createApplicationUseCase(repo);
    const ctx = createValidContext();

    const result = await useCase(ctx, {
      candidateId,
      vacancyId,
      assignedVacancyLocationId: locationId,
      sourceId,
      notes: "High priority candidate",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const app = result.value;
      expect(app.tenantId).toBe(tenantId);
      expect(app.candidateId).toBe(candidateId);
      expect(app.vacancyId).toBe(vacancyId);
      expect(app.currentStageId).toBe(initialStageId);
      expect(app.outcome).toBe("NONE");
      expect(app.assignedVacancyLocationId).toBe(locationId);
      expect(app.sourceId).toBe(sourceId);
      expect(app.createdById).toBe(actorUserId);
      expect(app.notes).toBe("High priority candidate");
    }
  });
});
