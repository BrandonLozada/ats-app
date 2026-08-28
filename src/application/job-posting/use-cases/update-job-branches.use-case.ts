import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";

export async function updateJobBranchesUseCase(input: {
  jobId: string;
  branchIds: string[];
}) {
  const ctx = await createAppContext();

  requirePermission(ctx, "job.update");

  // const data = createJobPostingSchema.parse(input);

  const prisma = PrismaService.client;

  const updated = await prisma.jobPosting.update({
    where: { id: input.jobId },
    data: {
      branches: {
        deleteMany: {},
        create: input.branchIds.map((branchId) => ({
          branchId,
        })),
      },
    },
  });

  // Auditoría
  await AuditService.log({
    entity: "JobPosting",
    entityId: updated.id,
    action: "UPDATE",
    userId: ctx.userId,
    metadata: {
      // changes,
    },
  });

  return updated;
}
