import { z } from "zod";

export const SeniorityLevel = z.enum(
  ["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD", "MANAGER", "DIRECTOR"],
  { message: "Selecciona un nivel válido." },
);

export const stepDetailsSchema = z.object({
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  seniorityLevel: SeniorityLevel,
});

export type StepDetailsValues = z.infer<typeof stepDetailsSchema>;
