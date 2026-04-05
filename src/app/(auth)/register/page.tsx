import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconBriefcase } from "@tabler/icons-react";

import { AuthService } from "@/infrastructure/auth/auth.service";
import { RegisterForm } from "@/components/auth/register-form";
import { APP_NAME, COMPANY_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: "Crear cuenta",

  description: `Crea tu cuenta en ${APP_NAME} y accede a oportunidades laborales en ${COMPANY_NAME}. Completa tu perfil profesional, explora vacantes y postúlate en línea de forma rápida y sencilla.`,

  keywords: [
    "registro empleo",
    "crear cuenta trabajo",
    "bolsa de trabajo registro",
    "postularse empleo",
    "crear perfil profesional",
  ],

  openGraph: {
    title: `Crear cuenta · ${APP_NAME}`,
    description: `Regístrate en ${APP_NAME} y comienza tu proceso de postulación en ${COMPANY_NAME}.`,
    url: "/register",
  },

  twitter: {
    card: "summary",
    title: `Crear cuenta · ${APP_NAME}`,
    description: `Crea tu cuenta y accede a oportunidades laborales en ${COMPANY_NAME}.`,
  },

  alternates: {
    canonical: "/register",
  },
};

export default async function RegisterPage() {
  const session = await AuthService.getSession();

  if (session?.user) {
    return redirect("/");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <IconBriefcase className="size-4" />
            </div>
            {APP_NAME}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/register-background-image.webp"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
