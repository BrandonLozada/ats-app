"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormDescription,
//   FormMessage,
// } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { loginFormSchema, type LoginFormValues } from "@/lib/validations/auth";
import { handleRequest } from "@/utils/auth-helpers/client";
import { signInWithPassword } from "@/utils/auth-helpers/server";
import { APP_NAME } from "@/config/app";

interface PasswordSignInProps {
  allowEmail: boolean;
  redirectMethod: string;
}

type PasswordSignInFormProps = PasswordSignInProps &
  React.ComponentProps<"div">;

export function PasswordSignIn({
  className,
  allowEmail,
  redirectMethod,
  ...props
}: PasswordSignInFormProps) {
  const routerInstance = useRouter();
  const router = redirectMethod === "client" ? routerInstance : null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    console.log("PasswordSignIn: ", values);
    await handleRequest(values, signInWithPassword, router);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">¡Bienvenid@ a {APP_NAME}!</h1>
              <p className="text-balance text-muted-foreground">
                Ingresa tu correo electrónico y contraseña para acceder a tu
                cuenta.
              </p>
            </div>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="ejemplo@tucorreo.com" {...field} />
                    </FormControl>
                    {!form?.formState?.errors?.email && (
                      <FormDescription>
                        Ingresa el correo con el que registraste tu cuenta
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Contraseña</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    {!form?.formState?.errors?.password && (
                      <FormDescription>
                        Tu contraseña debe tener al menos 6 caracteres
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              className="w-full"
              pendingText="Iniciando..."
            >
              Iniciar sesión
            </SubmitButton>
            <div className="flex flex-col gap-2 text-sm">
              {allowEmail && (
                <p>
                  <Link
                    href="/auth/email-signin"
                    className="underline underline-offset-4"
                  >
                    Entrar con enlace mágico
                  </Link>
                </p>
              )}
              <div>
                <p>
                  ¿No tienes una cuenta?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="underline underline-offset-4"
                  >
                    Crea tu cuenta aquí
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </form>
      </Form> */}
    </div>
  );
}
