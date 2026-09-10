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
import { PrismaCandidateRepository } from "./infrastructure/prisma-candidate-repository";
import { createCandidateUseCase } from "./application/candidate/create-candidate";
import { updateCandidateUseCase } from "./application/candidate/update-candidate";
import {
  findPublishedVacanciesQuery,
  getPublicVacancyDetailsQuery,
} from "./infrastructure/queries/prisma-vacancy-public-read";
import { resolveCurrentPrivacyPolicyQuery } from "./infrastructure/queries/prisma-privacy-policy-read";
import type { PublicTenantContext } from "@/modules/organization/public";
import type {
  GetPublicVacancyDetailsInput,
  PublicVacancyDetails,
  PublicVacancySummary,
} from "./application/vacancy/vacancy-public.types";
import type { PublicVacancyReadError } from "./application/vacancy/vacancy-public.errors";
import type { PublicPrivacyPolicy } from "./application/privacy-policy/privacy-policy-public.types";
import type { PrivacyPolicyResolutionError } from "./application/privacy-policy/privacy-policy-public.errors";
import { Result, ok, err } from "@/platform/shared/result";

const prismaPipelineRepository = new PrismaPipelineRepository();
const prismaVacancyRepository = new PrismaVacancyRepository();
const prismaCandidateRepository = new PrismaCandidateRepository();

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

export const createCandidate = createCandidateUseCase(prismaCandidateRepository);
export const updateCandidate = updateCandidateUseCase(prismaCandidateRepository);

export async function findPublishedVacancies(
  ctx: PublicTenantContext
): Promise<Result<readonly PublicVacancySummary[], never>> {
  const vacancies = await findPublishedVacanciesQuery(ctx.tenantId);
  return ok(vacancies);
}

export async function getPublicVacancyDetails(
  ctx: PublicTenantContext,
  input: GetPublicVacancyDetailsInput
): Promise<Result<PublicVacancyDetails, PublicVacancyReadError>> {
  if (!input || typeof input.slug !== "string") {
    return err({
      code: "VACANCY_NOT_FOUND",
      message: "Vacancy not found.",
    });
  }

  const trimmedSlug = input.slug.trim();
  if (trimmedSlug.length === 0) {
    return err({
      code: "VACANCY_NOT_FOUND",
      message: "Vacancy not found.",
    });
  }

  const vacancy = await getPublicVacancyDetailsQuery(ctx.tenantId, trimmedSlug);
  if (!vacancy) {
    return err({
      code: "VACANCY_NOT_FOUND",
      message: "Vacancy not found.",
    });
  }

  return ok(vacancy);
}

export async function resolveCurrentPrivacyPolicy(
  ctx: PublicTenantContext
): Promise<Result<PublicPrivacyPolicy, PrivacyPolicyResolutionError>> {
  if (!ctx || typeof ctx.tenantId !== "string" || ctx.tenantId.trim().length === 0) {
    return err({
      code: "PRIVACY_POLICY_NOT_FOUND",
      message: "Active privacy policy not found.",
    });
  }

  return resolveCurrentPrivacyPolicyQuery(ctx.tenantId.trim());
}
