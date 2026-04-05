import { z } from "zod";

export const emailSignInFormSchema = z.object({
  email: z.email({
    message: "Introduce un correo electrónico válido.",
  }),
});

export type EmailSignInFormValues = z.infer<typeof emailSignInFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z.email({
    message: "Introduce un correo electrónico válido.",
  }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const loginFormSchema = z.object({
  email: z.email({
    message: "Introduce un correo electrónico válido.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signingUpFormSchema = z
  .object({
    email: z.email({
      message: "Introduce un correo electrónico válido.",
    }),
    password: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
    confirmPassword: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignUpFormValues = z.infer<typeof signingUpFormSchema>;

export const updatePasswordFormSchema = z
  .object({
    password: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
    confirmPassword: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordFormSchema>;
