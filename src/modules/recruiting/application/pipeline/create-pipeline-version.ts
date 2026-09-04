import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  PipelineVersionRecord,
} from "./pipeline.types";
import { PipelineError } from "./pipeline.errors";
import { ensureCanManagePipeline } from "./pipeline.rules";
import {
  PipelineRepositoryPort,
  PipelineDraftAlreadyExistsException,
} from "./ports/pipeline-repository";

export type CreatePipelineVersionInput = {
  readonly pipelineId: string;
};

export function createPipelineVersionUseCase(repo: PipelineRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: CreatePipelineVersionInput
  ): Promise<Result<PipelineVersionRecord, PipelineError>> => {
    // 1. Authorization check
    const authCheck = ensureCanManagePipeline(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    // 2. Verify pipeline exists in tenant
    const pipeline = await repo.findPipelineById(
      ctx.tenant.tenantId,
      input.pipelineId
    );
    if (!pipeline) {
      return err({
        code: "PIPELINE_NOT_FOUND",
        message: "Pipeline not found.",
      });
    }

    // 3. Fetch all existing versions
    const versions = await repo.findVersionsByPipelineId(
      ctx.tenant.tenantId,
      input.pipelineId
    );

    // 4. Enforce ONE DRAFT rule (Section 17: at most one active DRAFT per HiringPipeline)
    const existingDraft = versions.find((v) => v.status === "DRAFT");
    if (existingDraft) {
      return err({
        code: "PIPELINE_DRAFT_ALREADY_EXISTS",
        message: `A draft version (v${existingDraft.version}) already exists for this pipeline.`,
      });
    }

    // 5. Determine next version number
    const maxVersion = versions.reduce(
      (max, v) => (v.version > max ? v.version : max),
      0
    );
    const nextVersion = maxVersion + 1;

    // 6. Clone stages from latest PUBLISHED version (Section 16)
    const latestPublished = versions
      .filter((v) => v.status === "PUBLISHED")
      .sort((a, b) => b.version - a.version)[0];

    const sourceStages = latestPublished
      ? latestPublished.stages
      : versions[0]?.stages ?? [];

    if (sourceStages.length === 0) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: "Cannot create next version: no source stages found to clone.",
      });
    }

    const clonedStages = sourceStages.map((s) => ({
      name: s.name,
      category: s.category,
      order: s.order,
      isInitial: s.isInitial,
    }));

    // 7. Persist new draft version
    try {
      const version = await repo.createDraftVersion({
        tenantId: ctx.tenant.tenantId,
        pipelineId: input.pipelineId,
        version: nextVersion,
        stages: clonedStages,
      });
      return ok(version);
    } catch (e) {
      if (e instanceof PipelineDraftAlreadyExistsException) {
        return err({
          code: "PIPELINE_DRAFT_ALREADY_EXISTS",
          message: e.message,
        });
      }
      throw e;
    }
  };
}
