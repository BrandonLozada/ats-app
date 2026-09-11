import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import type {
  CreateApplicationInput,
  ApplicationRecord,
} from "./application.types";
import type { ApplicationError } from "./application.errors";
import { ensureCanCreateApplication } from "./application.policies";
import { isValidUuid } from "./application.rules";
import {
  ApplicationRepositoryPort,
  ApplicationAlreadyActiveException,
} from "./ports/application-repository";

export function createApplicationUseCase(repo: ApplicationRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: CreateApplicationInput
  ): Promise<Result<ApplicationRecord, ApplicationError>> => {
    // 1. Validate AuthenticatedContext / permission
    const authCheck = ensureCanCreateApplication(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    const tenantId = ctx.tenant.tenantId;
    const actorUserId = ctx.actor.userId;

    // 2. Validate input IDs format
    if (!input.candidateId || !isValidUuid(input.candidateId)) {
      return err({
        code: "APPLICATION_CANDIDATE_NOT_FOUND",
        message: "Candidate not found.",
      });
    }

    if (!input.vacancyId || !isValidUuid(input.vacancyId)) {
      return err({
        code: "APPLICATION_VACANCY_NOT_FOUND",
        message: "Vacancy not found.",
      });
    }

    const candidateId = input.candidateId.trim();
    const vacancyId = input.vacancyId.trim();

    try {
      // 3. Resolve Candidate in tenant
      const candidate = await repo.findCandidateInTenant(tenantId, candidateId);
      if (!candidate) {
        return err({
          code: "APPLICATION_CANDIDATE_NOT_FOUND",
          message: "Candidate not found.",
        });
      }

      // 4. Resolve Vacancy in tenant
      const vacancy = await repo.findVacancyForApplication(tenantId, vacancyId);
      if (!vacancy) {
        return err({
          code: "APPLICATION_VACANCY_NOT_FOUND",
          message: "Vacancy not found.",
        });
      }

      // 5. Verify Vacancy accepts applications (status === 'PUBLISHED')
      if (vacancy.status !== "PUBLISHED") {
        return err({
          code: "VACANCY_NOT_ACCEPTING_APPLICATIONS",
          message: "Vacancy is not currently accepting applications.",
        });
      }

      // 6. Resolve initial stage from Vacancy's pinned PipelineVersion
      const initialStages = await repo.findInitialStagesForPipelineVersion(
        vacancy.pipelineVersionId
      );

      if (initialStages.length === 0) {
        return err({
          code: "INITIAL_STAGE_NOT_FOUND",
          message: "No initial stage found for vacancy pipeline version.",
        });
      }

      if (initialStages.length > 1) {
        return err({
          code: "PIPELINE_CONFIGURATION_ERROR",
          message: "Multiple initial stages configured for pipeline version.",
        });
      }

      const initialStage = initialStages[0];

      // 7. Validate stage/pipeline invariant and stage category
      if (initialStage.pipelineVersionId !== vacancy.pipelineVersionId) {
        return err({
          code: "PIPELINE_CONFIGURATION_ERROR",
          message: "Initial stage does not belong to vacancy pipeline version.",
        });
      }

      if (initialStage.category !== "APPLIED") {
        return err({
          code: "PIPELINE_CONFIGURATION_ERROR",
          message: "Initial stage must belong to category APPLIED.",
        });
      }

      // 8. Validate optional assigned VacancyLocation
      let assignedLocationId: string | null = null;
      if (input.assignedVacancyLocationId !== undefined && input.assignedVacancyLocationId !== null) {
        const locId = input.assignedVacancyLocationId.trim();
        if (!isValidUuid(locId)) {
          return err({
            code: "VACANCY_LOCATION_NOT_FOUND",
            message: "Assigned vacancy location not found for this vacancy.",
          });
        }

        const validLocation = await repo.checkVacancyLocationBelongsToVacancyAndTenant(
          tenantId,
          vacancyId,
          locId
        );

        if (!validLocation) {
          return err({
            code: "VACANCY_LOCATION_NOT_FOUND",
            message: "Assigned vacancy location not found for this vacancy.",
          });
        }
        assignedLocationId = locId;
      }

      // 9. Validate optional ApplicationSource
      let sourceId: string | null = null;
      if (input.sourceId !== undefined && input.sourceId !== null) {
        const srcId = input.sourceId.trim();
        if (!isValidUuid(srcId)) {
          return err({
            code: "APPLICATION_SOURCE_NOT_FOUND",
            message: "Application source not found.",
          });
        }

        const validSource = await repo.checkApplicationSourceExists(srcId);
        if (!validSource) {
          return err({
            code: "APPLICATION_SOURCE_NOT_FOUND",
            message: "Application source not found.",
          });
        }
        sourceId = srcId;
      }

      // 10. Precheck active application (outcome = 'NONE')
      const existingActive = await repo.findActiveApplication(
        tenantId,
        candidateId,
        vacancyId
      );

      if (existingActive) {
        return err({
          code: "APPLICATION_ALREADY_ACTIVE",
          message: "An active application already exists for this candidate and vacancy.",
        });
      }

      // 11. Atomically create Application + initial ApplicationStageHistory
      const created = await repo.createApplicationWithInitialHistory(
        {
          tenantId,
          candidateId,
          vacancyId,
          currentStageId: initialStage.id,
          assignedVacancyLocationId: assignedLocationId,
          sourceId,
          outcome: "NONE",
          createdById: actorUserId,
          notes: input.notes?.trim() || null,
        },
        actorUserId
      );

      return ok(created);
    } catch (e: unknown) {
      if (e instanceof ApplicationAlreadyActiveException) {
        return err({
          code: "APPLICATION_ALREADY_ACTIVE",
          message: "An active application already exists for this candidate and vacancy.",
        });
      }

      return err({
        code: "APPLICATION_REPOSITORY_ERROR",
        message: "Failed to process application operation.",
      });
    }
  };
}
