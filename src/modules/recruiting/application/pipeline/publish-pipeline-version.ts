import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  PipelineVersionRecord,
} from "./pipeline.types";
import { PipelineError } from "./pipeline.errors";
import {
  ensureCanManagePipeline,
  validatePipelineStages,
} from "./pipeline.rules";
import { PipelineRepositoryPort } from "./ports/pipeline-repository";

export type PublishPipelineVersionInput = {
  readonly versionId: string;
};

export function publishPipelineVersionUseCase(repo: PipelineRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: PublishPipelineVersionInput
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

    // 3. Immutability check: cannot publish an already published version
    if (version.status === "PUBLISHED") {
      return err({
        code: "PIPELINE_VERSION_IMMUTABLE",
        message: "Pipeline version is already published.",
      });
    }

    // 4. Validate all stage invariants before publishing
    const stagesCheck = validatePipelineStages(version.stages);
    if (!stagesCheck.ok) {
      return stagesCheck;
    }

    // 5. Publish atomically
    const published = await repo.publishVersion(
      ctx.tenant.tenantId,
      input.versionId,
      new Date()
    );

    if (!published) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: "Pipeline version not found or not in draft status.",
      });
    }

    return ok(published);
  };
}
