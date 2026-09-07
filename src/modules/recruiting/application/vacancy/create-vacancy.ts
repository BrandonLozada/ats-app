import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  EmploymentType,
  VacancyRecord,
} from "./vacancy.types";
import { VacancyError } from "./vacancy.errors";
import { ensureCanCreateVacancy } from "./vacancy.policies";
import {
  validateVacancyTitle,
  validateVacancySlug,
  validateVacancyHeadcountAndLocations,
} from "./vacancy.rules";
import {
  VacancyRepositoryPort,
  VacancySlugAlreadyExistsException,
} from "./ports/vacancy-repository";

export type CreateVacancyInput = {
  readonly title: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly employmentType?: EmploymentType | null;
  readonly isRemote?: boolean;
  readonly departmentId: string;
  readonly legalEntityId: string;
  readonly pipelineVersionId: string;
  readonly openings: number;
  readonly locations: readonly {
    readonly locationId: string;
    readonly openings: number;
  }[];
};

export function createVacancyUseCase(repo: VacancyRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: CreateVacancyInput
  ): Promise<Result<VacancyRecord, VacancyError>> => {
    // 1. Authorization policy check
    const authCheck = ensureCanCreateVacancy(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    const tenantId = ctx.tenant.tenantId;

    // 2. Pure invariant validation
    const titleCheck = validateVacancyTitle(input.title);
    if (!titleCheck.ok) {
      return titleCheck;
    }
    const trimmedTitle = titleCheck.value;

    const slugCheck = validateVacancySlug(input.slug);
    if (!slugCheck.ok) {
      return slugCheck;
    }
    const trimmedSlug = slugCheck.value;

    const allocationCheck = validateVacancyHeadcountAndLocations(
      input.openings,
      input.locations
    );
    if (!allocationCheck.ok) {
      return allocationCheck;
    }
    const { openings, locations } = allocationCheck.value;

    // 3. Pre-check slug uniqueness in tenant
    const existingSlug = await repo.findVacancyBySlug(tenantId, trimmedSlug);
    if (existingSlug) {
      return err({
        code: "VACANCY_SLUG_ALREADY_EXISTS",
        message: `Vacancy with slug "${trimmedSlug}" already exists in this tenant.`,
      });
    }

    // 4. Validate organizational references belong to tenant
    const deptValid = await repo.checkDepartmentExistsInTenant(
      tenantId,
      input.departmentId
    );
    if (!deptValid) {
      return err({
        code: "DEPARTMENT_NOT_FOUND",
        message: `Department "${input.departmentId}" not found in this tenant.`,
      });
    }

    const legalEntityValid = await repo.checkLegalEntityExistsInTenant(
      tenantId,
      input.legalEntityId
    );
    if (!legalEntityValid) {
      return err({
        code: "LEGAL_ENTITY_NOT_FOUND",
        message: `LegalEntity "${input.legalEntityId}" not found in this tenant.`,
      });
    }

    for (const loc of locations) {
      const locValid = await repo.checkLocationBelongsToLegalEntityAndTenant(
        tenantId,
        input.legalEntityId,
        loc.locationId
      );
      if (!locValid) {
        return err({
          code: "LOCATION_NOT_FOUND",
          message: `Location "${loc.locationId}" not found for LegalEntity "${input.legalEntityId}" in this tenant.`,
        });
      }
    }

    // 5. Validate exact PipelineVersion belongs to tenant and is PUBLISHED
    const pv = await repo.findPipelineVersion(tenantId, input.pipelineVersionId);
    if (!pv) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: `PipelineVersion "${input.pipelineVersionId}" not found in this tenant.`,
      });
    }

    if (pv.status !== "PUBLISHED") {
      return err({
        code: "PIPELINE_VERSION_NOT_PUBLISHED",
        message: `PipelineVersion "${input.pipelineVersionId}" has status "${pv.status}". Only PUBLISHED pipeline versions can be assigned.`,
      });
    }

    // 6. Atomic persistence
    try {
      const created = await repo.createVacancyWithLocations({
        tenantId,
        departmentId: input.departmentId,
        legalEntityId: input.legalEntityId,
        pipelineVersionId: input.pipelineVersionId,
        title: trimmedTitle,
        slug: trimmedSlug,
        description: input.description ?? null,
        employmentType: input.employmentType ?? null,
        isRemote: Boolean(input.isRemote),
        openings,
        locations,
      });

      return ok(created);
    } catch (e) {
      if (e instanceof VacancySlugAlreadyExistsException) {
        return err({
          code: "VACANCY_SLUG_ALREADY_EXISTS",
          message: e.message,
        });
      }
      throw e;
    }
  };
}
