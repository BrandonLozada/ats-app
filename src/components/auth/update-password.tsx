"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  updatePasswordFormSchema,
  type UpdatePasswordFormValues,
} from "@/lib/validations/auth";
import { handleRequest } from "@/utils/auth-helpers/client";
import { updatePassword } from "@/utils/auth-helpers/server";
import { APP_NAME } from "@/config/app";

interface UpdatePasswordProps {
  redirectMethod: string;
}

type UpdatePasswordFormProps = UpdatePasswordProps &
  React.ComponentPropsWithoutRef<"form">;

export function UpdatePassword({
  className,
  redirectMethod,
  ...props
}: UpdatePasswordFormProps) {
  const routerInstance = useRouter();
  const router = redirectMethod === "client" ? routerInstance : null;

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: UpdatePasswordFormValues) {
    console.log("UpdatePassword: ", values);
    await handleRequest(values, updatePassword, router);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("flex flex-col gap-6", className)}
          {...props}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">
              Restablece tu contraseña | {APP_NAME}
            </h1>
            <p className="text-balance text-sm text-muted-foreground">
              Crea una nueva contraseña para tu cuenta en {APP_NAME}. Queremos
              asegurarnos de que solo tú tengas acceso a tus pedidos, deseos y
              secretos más lindos.
            </p>
          </div>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input id="password" type="password" {...field} />
                  </FormControl>
                  {!form?.formState?.errors?.password && (
                    <FormDescription>
                      Crea una contraseña segura y fácil de recordar. Debe tener
                      al menos 6 caracteres.
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comfirmar contraseña</FormLabel>
                  <FormControl>
                    <Input id="confirmPassword" type="password" {...field} />
                  </FormControl>
                  {!form?.formState?.errors?.confirmPassword && (
                    <FormDescription>
                      Vuelve a escribir tu contraseña. Asegúrate de que coincida
                      exactamente con la anterior.
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
            pendingText="Actualizando..."
          >
            Actualizar contraseña
          </SubmitButton>
        </form>
      </Form> */}
    </div>
  );
}
