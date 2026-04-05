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
import {
  emailSignInFormSchema,
  type EmailSignInFormValues,
} from "@/lib/validations/auth";
import { handleRequest } from "@/utils/auth-helpers/client";
import { signInWithEmail } from "@/utils/auth-helpers/server";
import { APP_NAME } from "@/config/app";

// Define prop type with allowPassword boolean
interface EmailSignInProps {
  allowPassword: boolean;
  redirectMethod: string;
  disableButton?: boolean;
}

type EmailSignInFormProps = EmailSignInProps & React.ComponentProps<"div">;

export function EmailSignIn({
  className,
  allowPassword,
  redirectMethod,
  disableButton,
  ...props
}: EmailSignInFormProps) {
  const routerInstance = useRouter();
  const router = redirectMethod === "client" ? routerInstance : null;

  const form = useForm<EmailSignInFormValues>({
    resolver: zodResolver(emailSignInFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: EmailSignInFormValues) {
    console.log("EmailSignIn: ", values);
    await handleRequest(values, signInWithEmail, router);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">
                ¡Bienvenid@ de nuevo a {APP_NAME}!
              </h1>
              <p className="text-balance text-muted-foreground">
                Ingresa tu correo electrónico para acceder a tu cuenta.
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
                      <Input
                        id="email"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        placeholder="ejemplo@tucorreo.com"
                        {...field}
                      />
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
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              className="w-full"
              pendingText="Iniciando..."
              disabled={disableButton}
            >
              Iniciar sesión
            </SubmitButton>
          </div>
        </form>
      </Form> */}
      <div className="flex flex-col gap-2 text-sm">
        {allowPassword && (
          <>
            <p>
              <Link
                href="/auth/password-signin"
                className="underline underline-offset-4"
              >
                Iniciar con correo y contraseña
              </Link>
            </p>
            <p>
              ¿No tienes una cuenta?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Crea tu cuenta aquí
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
