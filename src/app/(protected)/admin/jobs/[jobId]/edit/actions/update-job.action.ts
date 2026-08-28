"use server";

import { UpdateJobInput } from "@/application/job-posting/dto/update-job.input";
import { updateJobUseCase } from "@/application/job-posting/use-cases/update-job.use-case";
import { toNumberOrNull } from "@/application/shared/mappers/number.mapper";

export async function updateJobAction(input: UpdateJobInput) {
  const parsed: UpdateJobInput = {
    ...input,
    ...(input.salaryMin !== undefined && {
      salaryMin: toNumberOrNull(input.salaryMin),
    }),
    ...(input.salaryMax !== undefined && {
      salaryMax: toNumberOrNull(input.salaryMax),
    }),
  };

  // TODO: Borrar mensaje de consola.
  console.log("\nparsed: ", parsed);

  const job = await updateJobUseCase(parsed);

  return {
    ...job,
    salaryMin: job.salaryMin?.toNumber(),
    salaryMax: job.salaryMax?.toNumber(),
  };
}
