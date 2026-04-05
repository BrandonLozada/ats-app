import type { Metadata } from "next";

import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { requireRole } from "@/infrastructure/auth/route.guards";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Reclutador`,
    template: `%s · ${APP_NAME} · Recruiter`,
  },

  description: `Panel de reclutador en ${APP_NAME}, la plataforma oficial de empleo de ${COMPANY_NAME}. Administra vacantes, revisa candidatos y gestiona procesos de selección de manera eficiente.`,

  alternates: {
    canonical: "/recruiter",
  },

  robots: {
    index: false,
    follow: false,
  },

  openGraph: {
    title: `${APP_NAME} · Reclutador`,
    description: `Accede al panel de reclutador en ${APP_NAME} para gestionar vacantes y candidatos en ${COMPANY_NAME}.`,
    url: "/recruiter",
    siteName: APP_NAME,
    type: "website",
  },

  twitter: {
    card: "summary",
    title: `${APP_NAME} · Reclutador`,
    description: `Panel de reclutador en ${APP_NAME} para administración de vacantes y seguimiento de postulantes.`,
  },
};

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("RECRUITER");

  console.log("layout del recruiter: ")

  return <div className="recruiter-layout">{children}</div>;
}
