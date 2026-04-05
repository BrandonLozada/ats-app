"use server";

import { PrismaService } from "@/infrastructure/database/prisma.service";

// import { db } from "@/lib/db";
// import { auth } from "@/lib/auth";

export async function applyToJob(jobPostingId: string) {
  // const session = await auth();
  const session = { user: { id: "b7cfa971-6803-4228-be41-4701159c4b3f" } };

  if (!session) throw new Error("Unauthorized");

  // 1. Obtener candidato existente (enlace con usuario)
  const candidate = await PrismaService.client.candidate.findUnique({
    where: {
      userId: session.user.id,
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
