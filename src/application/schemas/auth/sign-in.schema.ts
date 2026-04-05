import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Correo electrónico inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
