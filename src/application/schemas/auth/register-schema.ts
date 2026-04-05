import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "El nombre es demasiado corto."),
    email: z.email(
      "Este correo no parece válido, revisa que esté bien escrito.",
    ),
    password: z
      .string()
      .trim()
      .min(6, "Tu contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string("Confirma tu contraseña para continuar."),
    image: z.string().optional(),
    callbackURL: z.string().optional(),
    rememberMe: z.boolean().optional(),
  })
  .refine(
    (data: { password: string; confirmPassword: string }) =>
      data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Las contraseñas no coinciden, por favor verifica.",
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;
