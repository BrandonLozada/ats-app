"use server";

import { deleteJobPostingUseCase } from "@/application/job-posting/use-cases/delete-job-posting.use-case";

export async function deleteJobAction(data: { id: string }) {
  return await deleteJobPostingUseCase({
    id: data.id,
  });
}
