import "server-only";

import { PrismaPipelineRepository } from "./infrastructure/prisma-pipeline-repository";
import { createPipelineUseCase } from "./application/pipeline/create-pipeline";
import { createPipelineVersionUseCase } from "./application/pipeline/create-pipeline-version";
import { updateDraftPipelineVersionUseCase } from "./application/pipeline/update-draft-pipeline-version";
import { publishPipelineVersionUseCase } from "./application/pipeline/publish-pipeline-version";
import {
  resolvePipelineVersionUseCase,
  resolveLatestPublishedPipelineVersionUseCase,
} from "./application/pipeline/resolve-pipeline-version";

const prismaPipelineRepository = new PrismaPipelineRepository();

export const createPipeline = createPipelineUseCase(prismaPipelineRepository);
export const createPipelineVersion = createPipelineVersionUseCase(
  prismaPipelineRepository
);
export const updateDraftPipelineVersion = updateDraftPipelineVersionUseCase(
  prismaPipelineRepository
);
export const publishPipelineVersion = publishPipelineVersionUseCase(
  prismaPipelineRepository
);
export const resolvePipelineVersion = resolvePipelineVersionUseCase(
  prismaPipelineRepository
);
export const resolveLatestPublishedPipelineVersion =
  resolveLatestPublishedPipelineVersionUseCase(prismaPipelineRepository);
