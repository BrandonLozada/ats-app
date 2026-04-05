import { IconSearch, IconBriefcase } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { COMPANY_NAME } from "@/config/app";

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-background"
      aria-labelledby="hero-heading"
    >
      {/* Background effects */}
      <div className="absolute -top-40 -left-40 w-125 h-125 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-50 -right-25 w-125 h-125 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/40 to-background" />

      {/* Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-4xl flex flex-col gap-10 md:gap-12">
          {/* Eyebrow */}
          <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
            Plataforma de bolsa de empleo
          </p>

          {/* SEO hidden description */}
          <p className="sr-only">
            Plataforma de empleo para encontrar oportunidades laborales en
            múltiples industrias y niveles profesionales.
          </p>

          {/* Title */}
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
          >
            Eleva tu carrera con{" "}
            <span className="bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {COMPANY_NAME}
            </span>{" "}
            y encuentra nuevas oportunidades
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Explora vacantes en áreas administrativas, operativas y
            tecnológicas. Descubre oportunidades que se ajustan a tu perfil
            profesional.
          </p>

          {/* Search Form */}
          <form
            action="/jobs"
            method="GET"
            className="w-full max-w-4xl rounded-2xl border bg-background/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row">
              {/* Input 1 */}
              <div className="flex items-center gap-3 px-5 min-h-min flex-1">
                <IconSearch
                  size={20}
                  stroke={1.5}
                  className="text-muted-foreground"
                />
                <label htmlFor="area" className="sr-only">
                  Buscar por área o departamento
                </label>
                <div className="w-full h-full p-1">
                  <Input
                    id="area"
                    name="area"
                    placeholder="Área o departamento"
                    className="border-0 h-full text-base bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-border" />

              {/* Input 2 */}
              <div className="flex items-center gap-3 px-5 min-h-min flex-1">
                <IconBriefcase
                  size={20}
                  stroke={1.5}
                  className="text-muted-foreground"
                />
                <label htmlFor="role" className="sr-only">
                  Buscar por puesto o habilidades
                </label>
                <div className="w-full h-full p-1">
                  <Input
                    id="role"
                    name="role"
                    placeholder="Puesto, habilidades o palabras clave"
                    className="border-0 h-full text-base bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="p-2">
                <Button
                  variant={"default"}
                  type="submit"
                  className="h-14 px-10 text-base font-semibold w-full md:w-auto"
                >
                  Buscar vacantes
                </Button>
              </div>
            </div>
          </form>

          {/* Social proof */}
          <div className="flex items-center gap-4 pt-4 flex-wrap">
            <div className="flex -space-x-2">
              <Avatar className="h-9 w-9 border">
                <AvatarImage
                  src="https://i.pravatar.cc/100?img=1"
                  alt="Avatar"
                />
                <AvatarFallback>U1</AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9 border">
                <AvatarImage
                  src="https://i.pravatar.cc/100?img=2"
                  alt="Avatar"
                />
                <AvatarFallback>U2</AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9 border">
                <AvatarImage
                  src="https://i.pravatar.cc/100?img=3"
                  alt="Avatar"
                />
                <AvatarFallback>U3</AvatarFallback>
              </Avatar>
            </div>

            <p className="text-sm text-muted-foreground">
              Únete a más de{" "}
              <span className="font-semibold text-foreground">
                2,400 profesionales
              </span>{" "}
              que ya encontraron oportunidades este mes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
