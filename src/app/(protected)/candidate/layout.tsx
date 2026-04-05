import type { Metadata } from "next";

import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { requireAuth, requireRole } from "@/infrastructure/auth/route.guards";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Candidato`,
    template: `%s · ${APP_NAME} · Candidate`,
  },

  description: `Área de candidato en ${APP_NAME}, la plataforma oficial de empleo de ${COMPANY_NAME}. Aquí puedes gestionar tu perfil, consultar vacantes y dar seguimiento a tus aplicaciones.`,

  alternates: {
    canonical: "/candidate",
  },

  robots: {
    index: false, // no indexar esta sección privada
    follow: false,
  },

  openGraph: {
    title: `${APP_NAME} · Candidato`,
    description: `Accede al panel de candidato en ${APP_NAME} para postularte a vacantes y administrar tu perfil en ${COMPANY_NAME}.`,
    url: "/candidate",
    siteName: APP_NAME,
    type: "website",
  },

  twitter: {
    card: "summary",
    title: `${APP_NAME} · Candidato`,
    description: `Panel de candidato en ${APP_NAME} para gestionar aplicaciones y explorar vacantes.`,
  },
};

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const user = session ? session.user : null;

  // await requireRole("CANDIDATE");

  return <div className="candidate-layout">{children}</div>;
}
