import { PrismaService } from "@/infrastructure/database/prisma.service";
import { authorize } from "@/application/common/authorization";
import { PERMISSIONS } from "@/domain/auth/permissions";
import { AuditService } from "@/infrastructure/audit/audit.service";

import { ApplicationNotFoundError } from "@/domain/application/application.errors";
import type { MoveStageDTO } from "@/domain/application/application.types";

export async function moveStageUseCase(input: MoveStageDTO) {
  const prisma = PrismaService.client;

  // 0. Validar permisos
  await authorize({
    userId: input.userId,
    permission: PERMISSIONS.APPLICATION_MOVE_STAGE,
  });

  // 1. Traer application + stage actual + siguiente stage
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: {
      stage: true,
      jobPosting: true,
    },
  });

  if (!application) {
    throw new ApplicationNotFoundError();
  }

  const nextStage = await prisma.pipelineStage.findUnique({
    where: { id: input.toStageId },
    include: {
      version: true,
    },
  });

  if (!nextStage) {
    throw new Error("Target stage not found");
  }

  // 2. Validar que pertenece al mismo pipeline a través de la jerarquía real:
  // PipelineStage -> PipelineVersion -> HiringPipeline
  if (!application.jobPosting || application.jobPosting.pipelineId !== nextStage.version.pipelineId) {
    throw new Error("Stage does not belong to job pipeline");
  }

  const fromStageId = application.stageId;

  // 4. Actualizar stage
  const updated = await prisma.application.update({
    where: { id: input.applicationId },
    data: {
      stageId: input.toStageId,
    },
  });

  // 5. Crear historial
  await prisma.applicationStageHistory.create({
    data: {
      applicationId: input.applicationId,
      fromStageId: fromStageId ?? null,
      toStageId: input.toStageId,
      movedById: input.userId ?? null,
      notes: input.notes,
    },
  });

  // 6. Auditoría
  await AuditService.log({
    entity: "Application",
    entityId: input.applicationId,
    action: "MOVE_STAGE",
    userId: input.userId,
    metadata: {
      fromStageId,
      toStageId: input.toStageId,
    },
  });

  return updated;
}
