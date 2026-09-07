import {
  EmploymentType,
  VacancyRecord,
} from "../vacancy.types";
import type { PipelineVersionStatus } from "../../pipeline/pipeline.types";
export type { PipelineVersionStatus };

export class VacancySlugAlreadyExistsException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VacancySlugAlreadyExistsException";
  }
}

export type CreateVacancyData = {
  readonly tenantId: string;
  readonly departmentId: string;
  readonly legalEntityId: string;
  readonly pipelineVersionId: string;
  readonly title: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly employmentType?: EmploymentType | null;
  readonly isRemote?: boolean;
  readonly openings: number;
  readonly locations: readonly {
    readonly locationId: string;
    readonly openings: number;
  }[];
};

export interface VacancyRepositoryPort {
  findVacancyById(tenantId: string, id: string): Promise<VacancyRecord | null>;
  findVacancyBySlug(tenantId: string, slug: string): Promise<VacancyRecord | null>;

  checkDepartmentExistsInTenant(
    tenantId: string,
    departmentId: string
  ): Promise<boolean>;

  checkLegalEntityExistsInTenant(
    tenantId: string,
    legalEntityId: string
  ): Promise<boolean>;

  checkLocationBelongsToLegalEntityAndTenant(
    tenantId: string,
    legalEntityId: string,
    locationId: string
  ): Promise<boolean>;

  findPipelineVersion(
    tenantId: string,
    pipelineVersionId: string
  ): Promise<{ id: string; status: PipelineVersionStatus } | null>;

  createVacancyWithLocations(data: CreateVacancyData): Promise<VacancyRecord>;

  /**
   * Performs a conditional atomic transition from DRAFT to PUBLISHED.
   * If the row does not exist, belongs to another tenant, or was already transitioned,
   * returns null.
   */
  publishVacancy(
    tenantId: string,
    vacancyId: string,
    publishedAt: Date
  ): Promise<VacancyRecord | null>;
}
