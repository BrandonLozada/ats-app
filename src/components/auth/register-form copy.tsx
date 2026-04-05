"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconX } from "@tabler/icons-react";

import {
  RegisterInput,
  registerSchema,
} from "@/application/schemas/auth/register-schema";
import { registerAction } from "@/interfaces/http/actions/auth.actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/config/app";

type RegisterFormProps = React.ComponentProps<"form">;

export function RegisterForm({ className, ...props }: RegisterFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterInput) => {
    startTransition(async () => {
      await registerAction(data);
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Completa el formulario para crear tu cuenta en {APP_NAME}
          </p>
        </div>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
              <Input
                {...field}
                id="name"
                type="text"
                aria-invalid={fieldState.invalid}
                placeholder="John Doe"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Correo electrónico profesional</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                aria-invalid={fieldState.invalid}
                placeholder="m@example.com"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              {!form.formState.errors.email && (
                <FieldDescription>
                  Te enviaremos información importante a este correo.
                </FieldDescription>
              )}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">Contraseña segura</FieldLabel>
                <Input
                  {...field}
                  id="password"
                  type="password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmar contraseña
                </FieldLabel>
                <Input
                  {...field}
                  id="confirmPassword"
                  type="password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
              </Field>
            )}
          />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {form.formState.errors.password ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <IconX size={18} />
              <span>{form.formState.errors.password.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <IconCheck size={18} />
              <span>Mínimo 6 caracteres. Evita usar contraseñas comunes.</span>
            </div>
          )}
          {form.formState.errors.confirmPassword ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <IconX size={18} />
              <span>{form.formState.errors.confirmPassword.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <IconCheck size={18} />
              <span>
                Repite la contraseña tal cual para evitar errores de acceso.
              </span>
            </div>
          )}
        </div>
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Iniciar registro"}
          </Button>
        </Field>
        <FieldSeparator>O continua con</FieldSeparator>
        <Field>
          <Button variant="outline" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            <span className="">Login with Google</span>
          </Button>
          <FieldDescription className="px-6 text-center">
            ¿Ya tienes una cuenta?{" "}
            <Link href="login" className="underline underline-offset-4">
              Inicia sesión aquí
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
