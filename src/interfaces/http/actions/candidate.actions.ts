"use server";

import { createAppContext } from "@/infrastructure/auth/create-context";
import { candidateService } from "@/application/services/candidate.service";

export async function getMyCandidateProfile(tenantId?: string) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("Transitional getMyCandidateProfile: tenantId is required to resolve candidate profile.");
  }
  const ctx = await createAppContext(tenantId);

  const candidate = await candidateService.getByUserId(tenantId, ctx.userId);

  if (!candidate) {
    throw new Error("Candidate profile not found");
  }

  return candidate;
}
