import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";
import { moveStageSchema } from "../schemas/move-stage.schema";

// Mover application de stage A → stage B

// Validar:
// ✔ usuario autenticado
// ✔ permisos
// ✔ que la aplicación existe
// ✔ que el stage destino pertenece al mismo pipeline
// ✔ reglas (no mover desde final si no quieres)
// ✔ evitar no-op (mover al mismo stage)

// Efectos:
// ✔ actualizar stageId
// ✔ crear ApplicationStageHistory
// ✔ registrar AuditLog

export async function moveStageUseCase(input: unknown) {
  const prisma = PrismaService.client;

  const data = moveStageSchema.parse(input);

  const ctx = await createAppContext();

  requirePermission(ctx, "application.move_stage");

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener application con contexto completo
    const application = await tx.application.findUnique({
      where: { id: data.applicationId },
      include: {
        stage: true,
        jobPosting: {
          include: {
            pipeline: {
              include: {
                versions: {
                  include: {
                    stages: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const currentStage = application.stage;
    if (!application.jobPosting) {
      throw new Error("Application has no job posting");
    }
    const pipeline = application.jobPosting.pipeline;

    if (!currentStage) {
      throw new Error("Application has no current stage");
    }

    // 2. Obtener stage destino
    const stages = pipeline.versions?.flatMap((v) => v.stages) ?? [];
    const targetStage = stages.find((s) => s.id === data.toStageId);

    if (!targetStage) {
      throw new Error("Target stage not in same pipeline");
    }

    // 3. Evitar mover al mismo stage
    if (currentStage.id === targetStage.id) {
      return application;
    }

    // 4. Reglas de negocio
    // Note: Legacy isFinal is removed in target schema; terminal semantics are deferred to Stage 6 ApplicationOutcome.

    // Ejemplo: no mover hacia atrás (opcional, tú decides)
    // if (targetStage.order < currentStage.order) {
    //   throw new Error("Cannot move backwards");
    // }

    // 5. Actualizar stage
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        stageId: targetStage.id,
      },
    });

    // 6. Crear historial
    await tx.applicationStageHistory.create({
      data: {
        applicationId: application.id,
        fromStageId: currentStage.id,
        toStageId: targetStage.id,
        movedById: ctx.userId,
        notes: data.notes ?? null,
      },
    });

    // 7. Audit log
    await AuditService.log({
      entity: "Application",
      entityId: application.id,
      action: "MOVE_STAGE",
      userId: ctx.userId,
      metadata: {
        fromStageId: currentStage.id,
        toStageId: targetStage.id,
      },
    });

    return updatedApplication;
  });
}
