import { Candidate } from "@/generated/prisma/client";

export function calculateCompleteness(candidate: Partial<Candidate>): number {
  let score = 0;

  if (candidate.firstName) score += 20;
  if (candidate.lastName) score += 20;
  if (candidate.email) score += 20;
  if (candidate.phone) score += 20;
  if (candidate.cvParsedData) score += 20;

  return score;
}

export function canBeActivated(candidate: Candidate): boolean {
  return calculateCompleteness(candidate) >= 60;
}
