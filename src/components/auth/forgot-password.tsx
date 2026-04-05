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
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { handleRequest } from "@/utils/auth-helpers/client";
import { requestPasswordUpdate } from "@/utils/auth-helpers/server";

// Define prop type with allowEmail boolean
interface ForgotPasswordProps {
  allowEmail: boolean;
  redirectMethod: string;
  disableButton?: boolean;
}

type ForgotPasswordFormProps = ForgotPasswordProps &
  React.ComponentProps<"div">;

export function ForgotPassword({
  className,
  allowEmail,
  redirectMethod,
  disableButton,
  ...props
}: ForgotPasswordFormProps) {
  const routerInstance = useRouter();
  const router = redirectMethod === "client" ? routerInstance : null;

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    console.log("ForgotPassword: ", values);
    await handleRequest(values, requestPasswordUpdate, router);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
              <p className="text-balance text-muted-foreground">
                No te preocupes, te ayudamos a recuperarla.
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
                        ingresa tu correo para enviarte las instrucciones de
                        recuperación
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
              pendingText="Enviando..."
              disabled={disableButton}
            >
              Enviar instrucciones
            </SubmitButton>
          </div>
        </form>
      </Form> */}
      <p>
        <Link
          href="/auth/password-signin"
          className="underline underline-offset-4"
        >
          Iniciar con correo y contraseña
        </Link>
      </p>
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
      <p>
        ¿No tienes una cuenta?{" "}
        <Link href="/auth/sign-up" className="underline underline-offset-4">
          Crea tu cuenta aquí
        </Link>
      </p>
    </div>
  );
}
