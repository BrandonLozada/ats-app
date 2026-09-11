import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import { Prisma, ApplicationOutcome as PrismaApplicationOutcome } from "@/generated/prisma/client";
import type {
  ApplicationRecord,
  ApplicationOutcome,
} from "../application/application/application.types";
import {
  ApplicationRepositoryPort,
  ApplicationAlreadyActiveException,
  CandidateForApplication,
  VacancyForApplication,
  InitialStageForVacancy,
  CreateApplicationData,
} from "../application/application/ports/application-repository";

type PrismaApplication = {
  id: string;
  tenantId: string | null;
  candidateId: string;
  jobPostingId: string | null;
  vacancyId: string | null;
  sourceId: string | null;
  stageId: string | null;
  currentStageId: string | null;
  outcome: PrismaApplicationOutcome;
  assignedVacancyLocationId: string | null;
  appliedAt: Date;
  notes: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapToApplicationRecord(raw: PrismaApplication): ApplicationRecord {
  if (!raw.tenantId || !raw.vacancyId || !raw.currentStageId) {
    throw new Error(
      "Corrupt application record: canonical tenantId, vacancyId, or currentStageId is missing."
    );
  }

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    candidateId: raw.candidateId,
    vacancyId: raw.vacancyId,
    currentStageId: raw.currentStageId,
    outcome: raw.outcome as ApplicationOutcome,
    assignedVacancyLocationId: raw.assignedVacancyLocationId,
    sourceId: raw.sourceId,
    appliedAt: raw.appliedAt,
    notes: raw.notes,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

const ACTIVE_APPLICATION_UNIQUE_INDEX =
  "applications_active_tenant_candidate_vacancy_key";

const ACTIVE_APPLICATION_INDEX_BOUNDARY_REGEX = new RegExp(
  `(?<![a-zA-Z0-9_])${ACTIVE_APPLICATION_UNIQUE_INDEX}(?![a-zA-Z0-9_])`
);

export function isActiveApplicationUniqueViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const meta = error.meta as Record<string, unknown> | undefined;
  const target = meta?.target;
  const constraint = meta?.constraint;

  if (typeof constraint === "string" && constraint === ACTIVE_APPLICATION_UNIQUE_INDEX) {
    return true;
  }

  if (typeof target === "string" && target === ACTIVE_APPLICATION_UNIQUE_INDEX) {
    return true;
  }

  if (
    Array.isArray(target) &&
    target.some((item) => item === ACTIVE_APPLICATION_UNIQUE_INDEX)
  ) {
    return true;
  }

  const driverAdapterError = meta?.driverAdapterError as
    | { cause?: { constraint?: { index?: string } } }
    | undefined;
  if (
    driverAdapterError?.cause?.constraint?.index ===
    ACTIVE_APPLICATION_UNIQUE_INDEX
  ) {
    return true;
  }

  if (
    typeof error.message === "string" &&
    ACTIVE_APPLICATION_INDEX_BOUNDARY_REGEX.test(error.message)
  ) {
    return true;
  }

  return false;
}

export type PrismaApplicationRepositoryOptions = {
  readonly testHookAfterAppCreate?: (
    tx: Prisma.TransactionClient,
    appId: string
  ) => Promise<void>;
};

export class PrismaApplicationRepository implements ApplicationRepositoryPort {
  constructor(private readonly options?: PrismaApplicationRepositoryOptions) {}

  async findCandidateInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateForApplication | null> {
    const candidate = await prisma.candidate.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: candidateId,
        },
      },
      select: {
        id: true,
        tenantId: true,
      },
    });

    return candidate;
  }

  async findVacancyForApplication(
    tenantId: string,
    vacancyId: string
  ): Promise<VacancyForApplication | null> {
    const vacancy = await prisma.vacancy.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: vacancyId,
        },
      },
      select: {
        id: true,
        tenantId: true,
        status: true,
        pipelineVersionId: true,
      },
    });

    return vacancy;
  }

  async findInitialStagesForPipelineVersion(
    pipelineVersionId: string
  ): Promise<readonly InitialStageForVacancy[]> {
    const stages = await prisma.pipelineStage.findMany({
      where: {
        pipelineVersionId,
        isInitial: true,
      },
      select: {
        id: true,
        pipelineVersionId: true,
        category: true,
        isInitial: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return stages;
  }

  async checkVacancyLocationBelongsToVacancyAndTenant(
    tenantId: string,
    vacancyId: string,
    locationId: string
  ): Promise<boolean> {
    const location = await prisma.vacancyLocation.findUnique({
      where: {
        tenantId_vacancyId_id: {
          tenantId,
          vacancyId,
          id: locationId,
        },
      },
      select: {
        id: true,
      },
    });

    return location !== null;
  }

  async checkApplicationSourceExists(sourceId: string): Promise<boolean> {
    const source = await prisma.applicationSource.findUnique({
      where: {
        id: sourceId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    return source !== null && source.isActive;
  }

  async findActiveApplication(
    tenantId: string,
    candidateId: string,
    vacancyId: string
  ): Promise<ApplicationRecord | null> {
    const app = await prisma.application.findFirst({
      where: {
        tenantId,
        candidateId,
        vacancyId,
        outcome: PrismaApplicationOutcome.NONE,
      },
    });

    if (!app) {
      return null;
    }

    return mapToApplicationRecord(app);
  }

  async createApplicationWithInitialHistory(
    data: CreateApplicationData,
    actorUserId: string | null
  ): Promise<ApplicationRecord> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Insert Application with canonical fields only (legacy fields NULL)
        const app = await tx.application.create({
          data: {
            tenantId: data.tenantId,
            candidateId: data.candidateId,
            vacancyId: data.vacancyId,
            currentStageId: data.currentStageId,
            outcome: PrismaApplicationOutcome.NONE,
            assignedVacancyLocationId: data.assignedVacancyLocationId,
            sourceId: data.sourceId,
            notes: data.notes ?? null,
            createdById: data.createdById,
            jobPostingId: null,
            stageId: null,
          },
        });

        // Test-only hook for verifying atomic rollback
        if (this.options?.testHookAfterAppCreate) {
          await this.options.testHookAfterAppCreate(tx, app.id);
        }

        // 2. Insert initial ApplicationStageHistory
        await tx.applicationStageHistory.create({
          data: {
            tenantId: data.tenantId,
            applicationId: app.id,
            fromStageId: null,
            toStageId: data.currentStageId,
            movedById: actorUserId,
            notes: "Initial application created",
          },
        });

        return mapToApplicationRecord(app);
      });
    } catch (e: unknown) {
      if (isActiveApplicationUniqueViolation(e)) {
        throw new ApplicationAlreadyActiveException(
          "An active application already exists for this candidate and vacancy."
        );
      }

      throw e;
    }
  }
}
