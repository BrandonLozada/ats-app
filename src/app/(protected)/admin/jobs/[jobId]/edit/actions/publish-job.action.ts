"use server";

import { publishJobUseCase } from "@/application/job-posting/use-cases/publish-job.use-case";

export async function publishJobAction(jobId: string) {
  return await publishJobUseCase({ jobId });
}
