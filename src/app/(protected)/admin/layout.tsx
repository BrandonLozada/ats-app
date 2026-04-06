import type { Metadata } from "next";

import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { requireRole } from "@/infrastructure/auth/route.guards";
import { AppSidebar } from "./components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
