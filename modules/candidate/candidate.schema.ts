import { z } from "zod";

export const findOrCreateCandidateSchema = z.object({
  email: z.email().optional(),
  phone: z.string().optional(),
  name: z.string().min(3),
  firstName: z.string().min(3),
  lastName: z.string().optional(),
});

export type FindOrCreateCandidateInput = z.infer<
  typeof findOrCreateCandidateSchema
>;
