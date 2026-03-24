import { z } from "zod";

export const createApplicationSchema = z.object({
  jobPostingId: z.uuid(),
  sourceId: z.uuid().optional(),

  candidate: z.object({
    email: z.email().optional(),
    phone: z.string().optional(),
    name: z.string().min(3),
    firstName: z.string().min(3),
    lastName: z.string().optional(),
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
