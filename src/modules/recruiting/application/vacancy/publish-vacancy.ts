import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import { VacancyRecord } from "./vacancy.types";
import { VacancyError } from "./vacancy.errors";
import { ensureCanPublishVacancy } from "./vacancy.policies";
import { validateVacancyHeadcountAndLocations } from "./vacancy.rules";
import { VacancyRepositoryPort } from "./ports/vacancy-repository";

export type PublishVacancyInput = {
  readonly vacancyId: string;
};

export function publishVacancyUseCase(repo: VacancyRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: PublishVacancyInput
  ): Promise<Result<VacancyRecord, VacancyError>> => {
    // 1. Authorization policy check
    const authCheck = ensureCanPublishVacancy(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    const tenantId = ctx.tenant.tenantId;

    // 2. Fetch existing vacancy (tenant-scoped)
    const vacancy = await repo.findVacancyById(tenantId, input.vacancyId);
    if (!vacancy) {
      return err({
        code: "VACANCY_NOT_FOUND",
        message: "Vacancy not found.",
      });
    }

    // 3. Lifecycle pre-check
    if (vacancy.status === "PUBLISHED") {
      return err({
        code: "VACANCY_ALREADY_PUBLISHED",
        message: "Vacancy is already published.",
      });
    }

    if (vacancy.status !== "DRAFT") {
      return err({
        code: "VACANCY_NOT_DRAFT",
        message: `Vacancy has status "${vacancy.status}". Only DRAFT vacancies can be published.`,
      });
    }

    // 4. Revalidate snapshot invariants before publication
    const allocationCheck = validateVacancyHeadcountAndLocations(
      vacancy.openings,
      vacancy.locations
    );
    if (!allocationCheck.ok) {
      return allocationCheck;
    }

    // Revalidate locations belong to LegalEntity and Tenant
    for (const loc of vacancy.locations) {
      const locValid = await repo.checkLocationBelongsToLegalEntityAndTenant(
        tenantId,
        vacancy.legalEntityId,
        loc.locationId
      );
      if (!locValid) {
        return err({
          code: "LOCATION_NOT_FOUND",
          message: `Location "${loc.locationId}" is no longer valid for LegalEntity "${vacancy.legalEntityId}".`,
        });
      }
    }

    // Revalidate PipelineVersion is still PUBLISHED
    const pv = await repo.findPipelineVersion(tenantId, vacancy.pipelineVersionId);
    if (!pv) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: `PipelineVersion "${vacancy.pipelineVersionId}" not found in this tenant.`,
      });
    }

    if (pv.status !== "PUBLISHED") {
      return err({
        code: "PIPELINE_VERSION_NOT_PUBLISHED",
        message: `PipelineVersion "${vacancy.pipelineVersionId}" has status "${pv.status}". Expected PUBLISHED.`,
      });
    }

    // 5. Conditional atomic state transition (WHERE status = 'DRAFT')
    const published = await repo.publishVacancy(
      tenantId,
      input.vacancyId,
      new Date()
    );

    if (!published) {
      // Row was either concurrently transitioned or is no longer DRAFT
      const current = await repo.findVacancyById(tenantId, input.vacancyId);
      if (!current) {
        return err({
          code: "VACANCY_NOT_FOUND",
          message: "Vacancy not found.",
        });
      }
      if (current.status === "PUBLISHED") {
        return err({
          code: "VACANCY_ALREADY_PUBLISHED",
          message: "Vacancy was concurrently published.",
        });
      }
      return err({
        code: "VACANCY_NOT_DRAFT",
        message: `Vacancy has status "${current.status}". Only DRAFT vacancies can be published.`,
      });
    }

    return ok(published);
  };
}
