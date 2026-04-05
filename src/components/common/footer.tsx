import Link from "next/link";

import { APP_NAME } from "@/config/app";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 md:px-6 2xl:max-w-350 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Created with{" "}
              <span className="text-red-500 animate-pulse">❤️</span> by
            </span>
            <a
              href="https://brandonlozada.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold hover:text-primary transition-transform duration-200 hover:scale-105"
            >
              brandonlozada.dev
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <nav className="flex gap-4 md:gap-6">
            <Link
              href="#"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Términos
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacidad
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Contacto
            </Link>
          </nav>
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {year} {APP_NAME}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
