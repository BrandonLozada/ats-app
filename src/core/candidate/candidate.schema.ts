import { z } from "zod";

// Por ahora no se usa pero se tiene destinado a que se use en el use case de findOrCreateCandidate del módulo Candidate
export const findOrCreateCandidateSchema = z.object({
  email: z.email().optional(),
  phone: z.string().optional(),
  name: z.string().min(3),
  firstName: z.string().min(3),
  lastName: z.string().optional(),
  sourceId: z.uuid().optional(),
});

export type FindOrCreateCandidateInput = z.infer<
  typeof findOrCreateCandidateSchema
>;
