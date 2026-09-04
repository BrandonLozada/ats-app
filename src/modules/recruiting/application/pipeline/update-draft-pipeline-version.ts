import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  PipelineVersionRecord,
  StageInput,
} from "./pipeline.types";
import { PipelineError } from "./pipeline.errors";
import {
  ensureCanManagePipeline,
  validatePipelineStages,
} from "./pipeline.rules";
import { PipelineRepositoryPort } from "./ports/pipeline-repository";

export type UpdateDraftPipelineVersionInput = {
  readonly versionId: string;
  readonly stages: readonly StageInput[];
};

export function updateDraftPipelineVersionUseCase(
  repo: PipelineRepositoryPort
) {
  return async (
    ctx: AuthenticatedContext,
    input: UpdateDraftPipelineVersionInput
  ): Promise<Result<PipelineVersionRecord, PipelineError>> => {
    // 1. Authorization check
    const authCheck = ensureCanManagePipeline(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    // 2. Fetch version (tenant-scoped)
    const version = await repo.findVersionById(
      ctx.tenant.tenantId,
      input.versionId
    );
    if (!version) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: "Pipeline version not found.",
      });
    }

    // 3. Immutability check: Only DRAFT versions can be modified
    if (version.status === "PUBLISHED") {
      return err({
        code: "PIPELINE_VERSION_IMMUTABLE",
        message: "Published pipeline versions are immutable and cannot be updated.",
      });
    }

    // 4. Validate stage invariants
    const stagesCheck = validatePipelineStages(input.stages);
    if (!stagesCheck.ok) {
      return stagesCheck;
    }

    // 5. Atomically replace stages
    const updated = await repo.replaceDraftStages(
      ctx.tenant.tenantId,
      input.versionId,
      stagesCheck.value
    );

    if (!updated) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: "Pipeline version not found or not in draft status.",
      });
    }

    return ok(updated);
  };
}
