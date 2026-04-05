import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { CreateApplicationDTO } from "@/domain/application/application.types";

export class ApplicationAlreadyExistsError extends Error {
  constructor() {
    super("Application already exists for this candidate and job posting");
  }
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
  }
}

export class InvalidStageTransitionError extends Error {
  constructor() {
    super("Invalid stage transition");
  }
}

export async function createApplicationUseCase(input: CreateApplicationDTO) {
  const prisma = PrismaService.client;

  // 1. Validación de unicidad
  const existing = await prisma.application.findUnique({
    where: {
      candidateId_jobPostingId: {
        candidateId: input.candidateId,
        jobPostingId: input.jobPostingId,
      },
    },
  });

  if (existing) {
    throw new ApplicationAlreadyExistsError();
  }

  // 2. Crear
  const application = await prisma.application.create({
    data: {
      candidateId: input.candidateId,
      jobPostingId: input.jobPostingId,
      createdById: input.userId ?? null,
    },
  });

  // 3. Auditoría
  await AuditService.log({
    entity: "Application",
    entityId: application.id,
    action: "CREATE",
    userId: input.userId,
    metadata: {
      candidateId: input.candidateId,
      jobPostingId: input.jobPostingId,
    },
  });

  return application;
}
