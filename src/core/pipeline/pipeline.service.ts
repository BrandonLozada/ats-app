import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";

import { MoveStageInput } from "./pipeline.types";
import { ensureNotFinalStage, ensureSamePipeline } from "./pipeline.rules";
import { canMoveApplication } from "@/core/auth/abac";

export const PipelineService = {
  async moveApplicationStage(input: MoveStageInput, user: any) {
    const { applicationId, toStageId } = input;

    // 1. Obtener aplicación con contexto completo
    const application = await PrismaService.client.application.findUnique({
      where: { id: applicationId },
      include: {
        stage: true,
        jobPosting: true,
      },
    });

    if (!application) throw new Error("Application not found");

    // 2. Obtener stage destino
    const toStage = await PrismaService.client.pipelineStage.findUnique({
      where: { id: toStageId },
    });

    if (!toStage) throw new Error("Target stage not found");

    const fromStage = application.stage;

    // 3. Validaciones de negocio
    ensureNotFinalStage(fromStage);
    ensureSamePipeline(fromStage, toStage);

    // 4. ABAC (CRÍTICO)
    if (!canMoveApplication(user, application)) {
      throw new Error("Unauthorized to move this application");
    }

    // 5. Transacción
    const result = await PrismaService.client.$transaction(async (tx) => {
      // Actualizar stage actual
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          stageId: toStageId,
        },
      });

      // Crear historial
      await tx.applicationStageHistory.create({
        data: {
          applicationId,
          fromStageId: fromStage?.id,
          toStageId,
          movedById: user.id,
        },
      });

      return updated;
    });

    // 6. Audit log
    await AuditService.log({
      entity: "Application",
      entityId: applicationId,
      action: "MOVE_STAGE",
      userId: user.id,
      metadata: {
        fromStageId: fromStage?.id,
        toStageId,
      },
    });

    return result;
  },
};
