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
            versions: {
              include: {
                stages: true,
              },
            },
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

    // 5. Obtener stage inicial
    // Transitional compatibility: verify exactly one usable PipelineVersion exists or fail explicitly if ambiguous.
    // TODO [I6-S3-T03]: Replace transitional resolution with canonical Recruiting module version resolver.
    const versions = pipeline.versions ?? [];
    if (versions.length === 0) {
      throw new Error("Pipeline has no versions");
    }
    if (versions.length > 1) {
      throw new Error("Ambiguous pipeline version: multiple versions exist for legacy job posting");
    }

    const stages = versions[0].stages;
    const initialStage =
      stages.find((s) => s.isInitial) ||
      stages.find((s) => s.category === "APPLIED") ||
      stages.slice().sort((a, b) => a.order - b.order)[0];

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
