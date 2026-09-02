"use server";

import { createAppContext } from "@/infrastructure/auth/create-context";
import { candidateService } from "@/application/services/candidate.service";

export async function getMyCandidateProfile() {
  const ctx = await createAppContext();

  const candidate = await candidateService.getByUserId(ctx.userId);

  if (!candidate) {
    throw new Error("Candidate profile not found");
  }

  return candidate;
}
