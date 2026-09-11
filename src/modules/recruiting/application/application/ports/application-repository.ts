import type { ApplicationRecord } from "../application.types";

export class ApplicationAlreadyActiveException extends Error {
  constructor(
    message = "An active application already exists for this candidate and vacancy."
  ) {
    super(message);
    this.name = "ApplicationAlreadyActiveException";
  }
}

export type CandidateForApplication = {
  readonly id: string;
  readonly tenantId: string;
};

export type VacancyForApplication = {
  readonly id: string;
  readonly tenantId: string;
  readonly status: string;
  readonly pipelineVersionId: string;
};

export type InitialStageForVacancy = {
  readonly id: string;
  readonly pipelineVersionId: string;
  readonly category: string;
  readonly isInitial: boolean;
};

export type CreateApplicationData = {
  readonly tenantId: string;
  readonly candidateId: string;
  readonly vacancyId: string;
  readonly currentStageId: string;
  readonly assignedVacancyLocationId: string | null;
  readonly sourceId: string | null;
  readonly outcome: "NONE";
  readonly createdById: string | null;
  readonly notes?: string | null;
};

export interface ApplicationRepositoryPort {
  findCandidateInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateForApplication | null>;

  findVacancyForApplication(
    tenantId: string,
    vacancyId: string
  ): Promise<VacancyForApplication | null>;

  findInitialStagesForPipelineVersion(
    pipelineVersionId: string
  ): Promise<readonly InitialStageForVacancy[]>;

  checkVacancyLocationBelongsToVacancyAndTenant(
    tenantId: string,
    vacancyId: string,
    locationId: string
  ): Promise<boolean>;

  checkApplicationSourceExists(sourceId: string): Promise<boolean>;

  findActiveApplication(
    tenantId: string,
    candidateId: string,
    vacancyId: string
  ): Promise<ApplicationRecord | null>;

  createApplicationWithInitialHistory(
    data: CreateApplicationData,
    actorUserId: string | null
  ): Promise<ApplicationRecord>;
}
