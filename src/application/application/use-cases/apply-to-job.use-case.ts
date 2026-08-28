import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { applyToJobSchema } from "../schemas/apply-to-job.schema";
import { normalizeEmail } from "@/shared/utils/normalize-email";

export async function applyToJobUseCase(input: unknown) {
  const prisma = PrismaService.client;

  const data = applyToJobSchema.parse(input);

  // Contexto (puede no haber sesión)
  let ctx: Awaited<ReturnType<typeof createAppContext>> | null = null;

  try {
    ctx = await createAppContext();
  } catch {
    ctx = null;
  }

  const normalizedEmail = normalizeEmail(data.email || "");

  // 1. Buscar candidate existente
  let candidate = null;

  if (normalizedEmail) {
    candidate = await prisma.candidate.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });
  }

  // 2. Crear candidate si no existe
  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: normalizedEmail,
        phone: data.phone,
        cvUrl: data.cvUrl,
        sourceId: data.sourceId,
        userId: ctx?.userId ?? null,
      },
    });
  }

  // 3. Linkear user ↔ candidate (lazy linking)
  if (ctx?.userId && !candidate.userId) {
    candidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        userId: ctx.userId,
      },
    });
  }

  // 4. Evitar duplicados
  const existingApplication = await prisma.application.findUnique({
    where: {
      candidateId_jobPostingId: {
        candidateId: candidate.id,
        jobPostingId: data.jobPostingId,
      },
    },
  });

  if (existingApplication) {
    return existingApplication;
  }

  // 5. Obtener job + pipeline
  const job = await prisma.jobPosting.findUnique({
    where: { id: data.jobPostingId },
    include: {
      pipeline: {
        include: {
          stages: true,
        },
      },
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // 6. Obtener stage inicial (APPLIED)
  const initialStage = job.pipeline.stages
    .filter((s) => s.type === "APPLIED")
    .sort((a, b) => a.order - b.order)[0];

  if (!initialStage) {
    throw new Error("Pipeline has no APPLIED stage");
  }

  // TODO: Podríamos hacer todo esto en una transacción para optimizar, pero por simplicidad lo dejamos así por ahora.
  // 7. Crear application
  const application = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobPostingId: job.id,
      stageId: initialStage.id,
      sourceId: data.sourceId,
      notes: data.notes,
      createdById: ctx?.userId ?? null,
    },
  });

  // 8. Crear historial inicial
  await prisma.applicationStageHistory.create({
    data: {
      applicationId: application.id,
      toStageId: initialStage.id,
      movedById: ctx?.userId ?? null,
      notes: "Initial application",
    },
  });

  // 9. Audit log
  await AuditService.log({
    entity: "Application",
    entityId: application.id,
    action: "CREATE",
    userId: ctx?.userId ?? null,
    metadata: {
      jobPostingId: job.id,
      candidateId: candidate.id,
    },
  });

  return application;
}
