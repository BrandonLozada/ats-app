import { z } from "zod";

export const EmploymentType = z.enum(
  [
    "FULL_TIME",
    "PART_TIME",
    "CONTRACTOR",
    "TEMPORARY",
    "INTERN",
    "VOLUNTEER",
    "PER_DIEM",
  ],
  { message: "Selecciona un tipo de contexto válido." },
);

export const stepBasicSchema = z.object({
  title: z
    .string()
    .min(3, { message: "El título debe tener al menos 3 caracteres." })
    .max(100, { message: "El título no puede exceder los 100 caracteres." }),

  slug: z
    .string()
    .min(3, { message: "El slug debe tener al menos 3 caracteres." })
    .regex(/^[a-z0-9-]+$/, {
      message: "El slug solo puede contener minúsculas, números y guiones.",
    }),

  description: z
    .string()
    .min(10, { message: "La descripción debe tener al menos 10 caracteres." })
    .max(500, {
      message: "La descripción no puede exceder los 500 caracteres.",
    }),

  employmentType: EmploymentType,

  categoryId: z.uuid({ message: "Selecciona una categoría válida." }),

  departmentId: z
    .uuid({ message: "Selecciona un departamento válido." })
    .optional(),

  pipelineId: z.uuid({ message: "Selecciona un pipeline válido." }),
});

export type StepBasicValues = z.infer<typeof stepBasicSchema>;
