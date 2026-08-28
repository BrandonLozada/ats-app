import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";

export interface PublishJobInput {
  jobId: string;
}

export async function publishJobUseCase(input: PublishJobInput) {
  const ctx = await createAppContext();

  requirePermission(ctx, "job.publish");

  const data = input;

  const prisma = PrismaService.client;

  // Obtener job
  const job = await prisma.jobPosting.findUnique({
    where: { id: data.jobId },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // Evitar doble publicación
  if (job.status === "PUBLISHED") {
    throw new Error("Job is already published");
  }

  // VALIDACIONES CRÍTICAS

  if (!job.title) {
    throw new Error("Title is required to publish");
  }

  if (!job.description) {
    throw new Error("Description is required to publish");
  }

  if (!job.employmentType) {
    throw new Error("Employment type is required");
  }

  if (!job.categoryId) {
    throw new Error("Category is required");
  }

  if (!job.pipelineId) {
    throw new Error("Pipeline is required");
  }

  // Validación salario
  if (job.salaryMin && job.salaryMax) {
    if (Number(job.salaryMin) > Number(job.salaryMax)) {
      throw new Error("Invalid salary range");
    }
  }

  // Validación fechas
  const now = new Date();

  if (job.validThrough && job.validThrough < now) {
    throw new Error("validThrough cannot be in the past");
  }

  // Publicación
  const updated = await prisma.jobPosting.update({
    where: { id: job.id },
    data: {
      status: "PUBLISHED",
      publishedAt: job.publishedAt ?? now,
      updatedById: ctx.userId,
    },
  });

  // Auditoría
  await AuditService.log({
    entity: "JobPosting",
    entityId: updated.id,
    action: "PUBLISH",
    userId: ctx.userId,
    metadata: {
      previousStatus: job.status,
      newStatus: "PUBLISHED",
    },
  });

  return updated;
}
