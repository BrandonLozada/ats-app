import { z } from "zod";

export const applyToJobSchema = z.object({
  jobPostingId: z.uuid(),

  name: z.string().min(3),
  firstName: z.string().min(2),
  lastName: z.string().optional(),

  email: z.email().optional(),
  phone: z.string().optional(),

  cvUrl: z.url().optional(),

  sourceId: z.uuid().optional(),

  notes: z.string().optional(),
});
