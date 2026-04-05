import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, Manrope } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { getURL } from "@/utils/helpers";

import "@/styles/globals.css";

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),

  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },

  description: `${APP_NAME} es la plataforma oficial de empleo de ${COMPANY_NAME}. Permite a los candidatos explorar vacantes, crear su perfil profesional y postularse en línea.`,

  applicationName: APP_NAME,

  icons: {
    icon: "/favicon.ico",
  },

  category: "jobs",

  keywords: [
    "bolsa de trabajo",
    "empleo",
    "vacantes",
    "reclutamiento",
    "trabajo",
  ],

  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: APP_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("font-sans", figtree.variable, manropeHeading.variable)}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased w-screen overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster
            position="bottom-right"
            richColors={true}
            closeButton={true}
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
