import { z } from "zod";

const numericString = z
  .string()
  .optional()
  .refine((val) => {
    if (!val || val.trim() === "") return true;
    return /^\d+$/.test(val);
  }, "Debe ser un número entero válido");

export const stepSalarySchema = z
  .object({
    salaryMin: numericString,
    salaryMax: numericString,
    salaryCurrency: z.string().min(1, "Selecciona una moneda."),
  })

  // Regla 1: ambos o ninguno
  .refine(
    (data) => {
      const hasMin = !!data.salaryMin;
      const hasMax = !!data.salaryMax;
      return hasMin === hasMax;
    },
    {
      message:
        "Debes ingresar ambos valores (mínimo y máximo) o dejar ambos vacíos.",
      path: ["salaryMax"],
    },
  )

  // Regla 2: min <= max
  .refine(
    (data) => {
      if (!data.salaryMin || !data.salaryMax) return true;

      return Number(data.salaryMin) <= Number(data.salaryMax);
    },
    {
      message: "El salario máximo debe ser mayor o igual al mínimo.",
      path: ["salaryMax"],
    },
  );

export type StepSalaryValues = {
  salaryMin?: string;
  salaryMax?: string;
  salaryCurrency: string;
};

export type StepSalaryOutput = StepSalaryValues;
