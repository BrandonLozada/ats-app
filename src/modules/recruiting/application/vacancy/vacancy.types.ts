export type VacancyStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACTOR"
  | "TEMPORARY"
  | "INTERN"
  | "VOLUNTEER"
  | "PER_DIEM";

export type VacancyLocationRecord = {
  readonly id: string;
  readonly locationId: string;
  readonly openings: number;
  readonly createdAt: Date;
};

export type VacancyRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly departmentId: string;
  readonly legalEntityId: string;
  readonly pipelineVersionId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly employmentType: EmploymentType | null;
  readonly isRemote: boolean;
  readonly openings: number;
  readonly status: VacancyStatus;
  readonly publishedAt: Date | null;
  readonly locations: readonly VacancyLocationRecord[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
