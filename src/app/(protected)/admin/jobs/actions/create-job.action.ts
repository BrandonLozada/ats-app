"use server";

import { createJobPostingUseCase } from "@/application/job-posting/use-cases/create-job-posting.use-case";

export async function createJobAction(input: unknown) {
  return await createJobPostingUseCase(input);
}
