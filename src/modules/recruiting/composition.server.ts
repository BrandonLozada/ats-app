import "server-only";

import { PrismaPipelineRepository } from "./infrastructure/prisma-pipeline-repository";
import { PrismaVacancyRepository } from "./infrastructure/prisma-vacancy-repository";
import { createPipelineUseCase } from "./application/pipeline/create-pipeline";
import { createPipelineVersionUseCase } from "./application/pipeline/create-pipeline-version";
import { updateDraftPipelineVersionUseCase } from "./application/pipeline/update-draft-pipeline-version";
import { publishPipelineVersionUseCase } from "./application/pipeline/publish-pipeline-version";
import {
  resolvePipelineVersionUseCase,
  resolveLatestPublishedPipelineVersionUseCase,
} from "./application/pipeline/resolve-pipeline-version";
import { createVacancyUseCase } from "./application/vacancy/create-vacancy";
import { publishVacancyUseCase } from "./application/vacancy/publish-vacancy";

const prismaPipelineRepository = new PrismaPipelineRepository();
const prismaVacancyRepository = new PrismaVacancyRepository();

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

export const createVacancy = createVacancyUseCase(prismaVacancyRepository);
export const publishVacancy = publishVacancyUseCase(prismaVacancyRepository);

