import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import { PipelineVersionRecord } from "./pipeline.types";
import { PipelineError } from "./pipeline.errors";
import { PipelineRepositoryPort } from "./ports/pipeline-repository";

export type ResolvePipelineVersionInput = {
  readonly versionId: string;
};

export type ResolveLatestPublishedVersionInput = {
  readonly pipelineId: string;
};

export function resolvePipelineVersionUseCase(repo: PipelineRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: ResolvePipelineVersionInput
  ): Promise<Result<PipelineVersionRecord, PipelineError>> => {
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

    // Section 25: DRAFT when published required -> NotFound
    if (version.status !== "PUBLISHED") {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: "Pipeline version not found or not published.",
      });
    }

    return ok(version);
  };
}

export function resolveLatestPublishedPipelineVersionUseCase(
  repo: PipelineRepositoryPort
) {
  return async (
    ctx: AuthenticatedContext,
    input: ResolveLatestPublishedVersionInput
  ): Promise<Result<PipelineVersionRecord, PipelineError>> => {
    const version = await repo.findLatestPublishedVersion(
      ctx.tenant.tenantId,
      input.pipelineId
    );

    if (!version) {
      return err({
        code: "PIPELINE_VERSION_NOT_FOUND",
        message: "No published pipeline version found.",
      });
    }

    return ok(version);
  };
}
