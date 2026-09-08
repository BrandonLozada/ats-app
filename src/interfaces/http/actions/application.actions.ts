// "use server";

// import { AuthService } from "@/infrastructure/auth/auth.service";
// import { ApplicationService } from "@/core/application/application.service";

// export async function applyToJobAction(input: {
//   candidateId: string;
//   jobPostingId: string;
//   sourceId?: string;
//   notes?: string;
// }) {
//   const session = await AuthService.getSession();

//   if (!session) throw new Error("Unauthorized");

//   return ApplicationService.applyToJob(input, session.user.id);
// }

"use server";

import { createAppContext } from "@/infrastructure/auth/context.factory";
// import { applicationService } from "@/application/services/application.service";
import { candidateService } from "@/application/services/candidate.service";
import { ApplicationService } from "@/core/application/application.service";
import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function applyToJobAction(jobPostingId: string) {
  const job = await PrismaService.client.jobPosting.findUnique({
    where: { id: jobPostingId },
    select: {
      department: { select: { tenantId: true } },
      pipeline: { select: { tenantId: true } },
    },
  });
  const tenantId = job?.department?.tenantId ?? job?.pipeline?.tenantId;
  if (!tenantId) {
    throw new Error("Transitional applyToJobAction: Unable to deterministically resolve tenantId for job posting.");
  }

  const ctx = await createAppContext(tenantId);

  const candidate = await candidateService.getByUserId(tenantId, ctx.userId);

  if (!candidate) throw new Error("Candidate not found");

  // Definir si se envía todo el contexto o solo el id del usuario
  return ApplicationService.applyToJob(
    {
      candidateId: candidate.id,
      jobPostingId,
    },
    ctx.userId,
  );
}

export async function getMyApplications(tenantId?: string) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("Transitional getMyApplications: tenantId is required to query candidate applications.");
  }
  const ctx = await createAppContext(tenantId);

  const candidate = await candidateService.getByUserId(tenantId, ctx.userId);

  if (!candidate) {
    return [];
  }

  return PrismaService.client.application.findMany({
    where: {
      candidateId: candidate.id,
    },
    include: {
      jobPosting: true,
      stage: true,
    },
  });
}
