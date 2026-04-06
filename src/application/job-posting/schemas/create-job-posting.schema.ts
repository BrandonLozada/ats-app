import { z } from "zod";

export const createJobPostingSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),

  categoryId: z.uuid(),
  departmentId: z.uuid().optional(),
  pipelineId: z.uuid(),

  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACTOR",
    "TEMPORARY",
    "INTERN",
    "VOLUNTEER",
    "PER_DIEM",
  ]),
});
