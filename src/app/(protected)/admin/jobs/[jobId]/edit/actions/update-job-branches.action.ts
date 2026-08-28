"use server";

import { updateJobBranchesUseCase } from "@/application/job-posting/use-cases/update-job-branches.use-case";

export async function updateJobBranchesAction(input: {
  jobId: string;
  branchIds: string[];
}) {
  return await updateJobBranchesUseCase(input);
}
