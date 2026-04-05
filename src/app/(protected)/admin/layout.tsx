import type { Metadata } from "next";

import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { requireRole } from "@/infrastructure/auth/route.guards";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Administración`,
    template: `%s · ${APP_NAME} · Admin`,
  },

  description: `Panel administrativo de ${APP_NAME}, la plataforma oficial de empleo de ${COMPANY_NAME}. Gestiona vacantes, candidatos y usuarios con herramientas avanzadas de reclutamiento.`,

  alternates: {
    canonical: "/admin",
  },

  robots: {
    index: false,
    follow: false,
  },

  openGraph: {
    title: `${APP_NAME} · Administración`,
    description: `Accede al panel de administración de ${APP_NAME} para gestionar procesos de reclutamiento en ${COMPANY_NAME}.`,
    url: "/admin",
    siteName: APP_NAME,
    type: "website",
  },

  twitter: {
    card: "summary",
    title: `${APP_NAME} · Administración`,
    description: `Panel administrativo de ${APP_NAME} para gestión de vacantes y candidatos.`,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");

  return <div className="admin-layout">{children}</div>;
}
