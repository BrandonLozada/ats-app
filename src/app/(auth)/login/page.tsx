import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthService } from "@/infrastructure/auth/auth.service";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME, COMPANY_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: "Iniciar sesión",

  description: `Accede a tu cuenta en ${APP_NAME} para continuar con tu proceso de postulación, gestionar tu perfil profesional y consultar el estado de tus aplicaciones en ${COMPANY_NAME}.`,

  robots: {
    index: false,
    follow: false,
  },

  openGraph: {
    title: `Iniciar sesión · ${APP_NAME}`,
    description: `Accede a tu cuenta para continuar con tu proceso de postulación en ${COMPANY_NAME}.`,
    url: "/login",
  },

  alternates: {
    canonical: "/login",
  },
};

export default async function LoginPage() {
  const session = await AuthService.getSession();

  if (session?.user) {
    return redirect("/");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm allowEmail={false} />
      </div>
    </div>
  );
}
