import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";
import { deleteJobPostingSchema } from "../schemas/delete-job-posting.schema";

export async function deleteJobPostingUseCase(input: unknown) {
  const ctx = await createAppContext();

  requirePermission(ctx, "job.delete");

  const data = deleteJobPostingSchema.parse(input);

  const prisma = PrismaService.client;

  const job = await prisma.jobPosting.delete({
    where: {
      id: data.id,
    },
  });

  await AuditService.log({
    entity: "JobPosting",
    entityId: job.id,
    action: "DELETE",
    userId: ctx.userId,
    metadata: {
      title: job.title,
    },
  });

  return job;
}
