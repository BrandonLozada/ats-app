import type { Metadata } from "next";
import Link from "next/link";
import { IconBriefcase } from "@tabler/icons-react";

import { AuthService } from "@/infrastructure/auth/auth.service";
import { APP_NAME, COMPANY_NAME } from "@/config/app";
import ModeToggleButton from "@/components/common/mode-toggle-button";
import UserButton from "@/components/common/user-button";
import Footer from "@/components/common/footer";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Bolsa de trabajo`,
    template: `%s · ${APP_NAME}`,
  },

  description: `${APP_NAME} es la plataforma oficial de empleo de ${COMPANY_NAME}. Consulta vacantes, crea tu perfil y postúlate en línea.`,

  alternates: {
    canonical: "/",
  },
};

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthService.getSession();

  const user = session ? session.user : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full h-16 z-50 border-b bg-background/50 backdrop-blur-2xl">
        <nav className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary">
                <IconBriefcase size={24} stroke={1.5} className="text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                {APP_NAME}
              </span>
            </Link>

            {/* NAV LINKS (desktop) */}
            <div className="hidden md:flex items-center gap-6 ml-6">
              <Link href="/jobs" className="text-sm">
                Vacantes
              </Link>
              <Link href="/explore" className="text-sm">
                Explorar
              </Link>
              <Link href="/about" className="text-sm">
                Sobre Nosotros
              </Link>
              <Link href="/departments" className="text-sm">
                Áreas
              </Link>
              <Link href="/location" className="text-sm">
                Ubicación
              </Link>
              <Link href="/contact" className="text-sm">
                Contacto
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            <ModeToggleButton className="rounded-full" />
            <UserButton user={user} />
            {/* Menú móvil */}
          </div>
        </nav>
      </header>

      {/* MAIN */}
      <div className="pt-16 flex-1 min-h-[calc(100vh-4rem)] overflow-y-scroll">
        {children}
      </div>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
