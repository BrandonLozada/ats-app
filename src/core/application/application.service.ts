import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";

import { ApplicationRepository } from "./application.repositoty";
import { ensureNotDuplicated, ensureJobIsOpen } from "./application.rules";
import { ApplyToJobInput } from "./application.types";

export const ApplicationService = {
  async applyToJob(input: ApplyToJobInput, userId?: string) {
    const { candidateId, jobPostingId, sourceId, notes } = input;

    // 1. Validar candidato
    const candidate = await PrismaService.client.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) throw new Error("Candidate not found");

    // 2. Validar job posting
    const job = await PrismaService.client.jobPosting.findUnique({
      where: { id: jobPostingId },
      include: {
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    ensureJobIsOpen(job);

    // 3. Validar duplicado
    const existing = await ApplicationRepository.findExisting(
      candidateId,
      jobPostingId,
    );

    ensureNotDuplicated(existing);

    // 4. Determinar pipeline
    const pipeline = job?.pipeline ?? null;
    if (!pipeline) throw new Error("Job has no pipeline assigned");

    // 5. Obtener stage inicial (APPLIED o el de menor orden)
    const initialStage =
      pipeline.stages.find((s) => s.type === "APPLIED") ||
      pipeline.stages.sort((a, b) => a.order - b.order)[0];

    if (!initialStage) {
      throw new Error("Pipeline has no stages");
    }

    // 6. Crear aplicación (TRANSACCIÓN PRO)
    const result = await PrismaService.client.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId,
          jobPostingId,
          sourceId,
          notes,
          stageId: initialStage.id,
          createdById: userId, // opcional
        },
      });

      // 7. Crear historial
      await tx.applicationStageHistory.create({
        data: {
          applicationId: application.id,
          toStageId: initialStage.id,
          movedById: userId,
        },
      });

      return application;
    });

    // 8. Audit log
    await AuditService.log({
      entity: "Application",
      entityId: result.id,
      action: "APPLY",
      userId,
      metadata: {
        candidateId,
        jobPostingId,
      },
    });

    return result;
  },
};
