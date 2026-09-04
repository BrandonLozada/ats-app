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
import {
  PipelineRepositoryPort,
  PipelineNameAlreadyExistsException,
} from "./ports/pipeline-repository";

export type CreatePipelineInput = {
  readonly name: string;
  readonly isDefault?: boolean;
  readonly stages: readonly StageInput[];
};

export function createPipelineUseCase(repo: PipelineRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: CreatePipelineInput
  ): Promise<Result<PipelineVersionRecord, PipelineError>> => {
    // 1. Authorization check
    const authCheck = ensureCanManagePipeline(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    // 2. Validate pipeline name
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: "Pipeline name cannot be empty.",
      });
    }

    // 3. Pre-check duplicate name in tenant
    const existing = await repo.findPipelineByName(
      ctx.tenant.tenantId,
      trimmedName
    );
    if (existing) {
      return err({
        code: "PIPELINE_NAME_ALREADY_EXISTS",
        message: `Pipeline with name "${trimmedName}" already exists in this tenant.`,
      });
    }

    // 4. Validate stage invariants
    const stagesCheck = validatePipelineStages(input.stages);
    if (!stagesCheck.ok) {
      return stagesCheck;
    }

    // 5. Persist atomically
    try {
      const version = await repo.createPipelineWithDraftVersion({
        tenantId: ctx.tenant.tenantId,
        name: trimmedName,
        isDefault: input.isDefault,
        stages: stagesCheck.value,
      });
      return ok(version);
    } catch (e) {
      if (e instanceof PipelineNameAlreadyExistsException) {
        return err({
          code: "PIPELINE_NAME_ALREADY_EXISTS",
          message: e.message,
        });
      }
      throw e;
    }
  };
}
