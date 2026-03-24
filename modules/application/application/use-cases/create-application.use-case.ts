import { applicationRepository } from "../../infrastructure/application.repository";
import { findOrCreateCandidate } from "@/modules/candidate/application/use-cases/find-or-create-candidate.use-case";
import { CreateApplicationInput } from "../../application.schema";

export async function createApplication(input: CreateApplicationInput) {
  const candidate = await findOrCreateCandidate(input.candidate);

  return applicationRepository.create({
    jobPostingId: input.jobPostingId,
    candidateId: candidate.id,
    sourceId: input.sourceId,
  });
}
