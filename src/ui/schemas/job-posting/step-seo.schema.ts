import { z } from "zod";

export const stepSeoSchema = z.object({
  metaTitle: z
    .string()
    .max(70, "El meta title no puede exceder 70 caracteres")
    .optional(),

  metaDescription: z
    .string()
    .max(160, "La meta description no puede exceder 160 caracteres")
    .optional(),

  noIndex: z.boolean().optional(),
});

export type StepSeoValues = z.infer<typeof stepSeoSchema>;
