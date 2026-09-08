"use server";

import { PrismaService } from "@/infrastructure/database/prisma.service";

// import { db } from "@/lib/db";
// import { auth } from "@/lib/auth";

export async function applyToJob(jobPostingId: string) {
  // const session = await auth();
  const session = { user: { id: "b7cfa971-6803-4228-be41-4701159c4b3f" } };

  if (!session) throw new Error("Unauthorized");

  // Deterministically resolve tenant from JobPosting
  const jobPosting = await PrismaService.client.jobPosting.findUnique({
    where: { id: jobPostingId },
    select: {
      department: { select: { tenantId: true } },
      pipeline: { select: { tenantId: true } },
    },
  });
  const tenantId = jobPosting?.department?.tenantId ?? jobPosting?.pipeline?.tenantId;
  if (!tenantId) {
    throw new Error("Transitional applyToJob: Unable to deterministically resolve tenantId for job posting.");
  }

  // 1. Obtener candidato existente (enlace con usuario bajo tenant)
  const candidate = await PrismaService.client.candidate.findUnique({
    where: {
      tenantId_authUserId: {
        tenantId,
        authUserId: session.user.id,
      },
    },
  });

  if (!candidate) {
    throw new Error("Candidate profile required");
  }

  // 2. Crear aplicación de vacante
  await PrismaService.client.application.create({
    data: {
      candidateId: candidate.id,
      jobPostingId,
    },
  });
}
