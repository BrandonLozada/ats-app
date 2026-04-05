import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconFileText,
  IconSearch,
  IconInfoCircle,
} from "@tabler/icons-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function OnboardingPage() {
  // TODO: Corregir y validar el flujo del usuario dependiendo del perfil completo.
  const user = {
    profileCompleted: false,
  };

  if (user.profileCompleted) {
    redirect("/dashboard");
  }
  // user.onboardingStep

  return (
    <div className="pt-16 min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-muted" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-30 bg-muted" />

      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        {/* LEFT SIDE */}
        <div className="md:col-span-5 space-y-8">
          <header className="space-y-4">
            <Badge variant="default" className="uppercase tracking-widest px-4">
              Bienvenido
            </Badge>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Construye tu perfil,
              <br />
              <span className="text-muted-foreground">
                listo para cualquier oportunidad.
              </span>
            </h1>

            <p className="text-muted-foreground text-lg">
              Para desbloquear todas las funcionalidades del sistema,
              necesitamos conocer tu información profesional.
            </p>
          </header>

          {/* Info Box */}
          <div className="flex items-start gap-4 p-4 rounded-xl border bg-muted/40">
            <IconInfoCircle size={20} stroke={1.5} className="w-5 h-5 mt-1" />
            <p className="text-sm">
              <strong>Nota:</strong> Puedes explorar primero, pero algunas
              acciones requerirán un perfil completo.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="md:col-span-7 grid gap-6">
          {/* OPTION 1 */}
          <Card className="p-8 bg-muted/60 hover:bg-muted/80 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
            <CardContent className="p-0 flex flex-col md:flex-row gap-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-muted">
                <IconFileText size={24} stroke={1.5} />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Completar perfil ahora</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sube tu información estructurada o completa los campos
                    manualmente.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Carga YAML</Badge>
                  <Badge variant="outline">Validación en tiempo real</Badge>
                </div>

                <Link href="/onboarding/profile">
                  <Button className="w-full md:w-auto">
                    Empezar onboarding
                    <IconArrowRight
                      size={18}
                      stroke={1.5}
                      className="ml-2 w-4 h-4"
                    />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* OPTION 2 */}
          <Card className="p-8 border! border-dashed ring-0 bg-muted/10 hover:bg-muted/60 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out">
            <CardContent className="p-0 flex flex-col md:flex-row gap-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-muted">
                <IconSearch size={24} stroke={1.5} />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-muted-foreground">
                    Explorar primero
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Navega por el sistema antes de completar tu perfil.
                  </p>
                </div>

                <Link href="/explore">
                  <Button variant="outline" className="w-full md:w-auto">
                    Omitir temporalmente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
