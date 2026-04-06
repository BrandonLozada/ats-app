import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";
import { createJobPostingSchema } from "../schemas/create-job-posting.schema";

export async function createJobPostingUseCase(input: unknown) {
  const ctx = await createAppContext();

  requirePermission(ctx, "job.create");

  const data = createJobPostingSchema.parse(input);

  const prisma = PrismaService.client;

  const job = await prisma.jobPosting.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      categoryId: data.categoryId,
      departmentId: data.departmentId,
      pipelineId: data.pipelineId,
      employmentType: data.employmentType,
      createdById: ctx.userId,
    },
  });

  await AuditService.log({
    entity: "JobPosting",
    entityId: job.id,
    action: "CREATE",
    userId: ctx.userId,
    metadata: {
      title: job.title,
    },
  });

  return job;
}
