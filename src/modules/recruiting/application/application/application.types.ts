export type ApplicationOutcome =
  | "NONE"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CANCELLED";

export type ApplicationRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly candidateId: string;
  readonly vacancyId: string;
  readonly currentStageId: string;
  readonly outcome: ApplicationOutcome;
  readonly assignedVacancyLocationId: string | null;
  readonly sourceId: string | null;
  readonly appliedAt: Date;
  readonly notes?: string | null;
  readonly createdById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateApplicationInput = {
  readonly candidateId: string;
  readonly vacancyId: string;
  readonly sourceId?: string | null;
  readonly assignedVacancyLocationId?: string | null;
  readonly notes?: string | null;
};
