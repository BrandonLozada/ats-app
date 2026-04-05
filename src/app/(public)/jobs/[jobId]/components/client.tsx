import Link from "next/link";

import {
  IconBuilding,
  IconClock,
  IconFlame,
  IconMoon,
  IconCurrencyDollar,
  IconBriefcase,
  IconCalendarTime,
  IconStethoscope,
  IconChecklist,
  IconGift,
  IconLock,
  IconMapPin,
  IconExternalLink,
} from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatSalary } from "@/utils/format-salary";
import { JobDetailUI } from "@/interfaces/ui/types/jobs/job.types";
import ApplySection from "./apply-section";
import SaveJob from "./save-job";

interface JobClientProps {
  job: JobDetailUI;
}

export default function JobClient({ job }: JobClientProps) {
  return (
    <div className="h-full mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 my-6">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center text-sm text-muted-foreground">
        <Link href="/">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs">Empleos</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">{job.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <div>
                  {/* TODO: Mostrar departamento de la posición dentro del hospital o interno. */}
                  <h1 className="text-3xl font-bold">{job.title} - ICU</h1>
                  {/* TODO: Mostrar sucursal o las vacantes abiertas a ella. */}
                  {job?.organization && (
                    <div className="flex gap-2">
                      <IconBuilding size={18} />
                      <p className="text-muted-foreground">
                        {job.organization.name} - Sucursal North Wing
                      </p>
                    </div>
                  )}
                </div>

                <Button className="sm:hidden w-full">Aplicar ahora</Button>
              </div>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge className="flex items-center gap-1">
                  <IconClock size={14} data-icon="inline-start" />
                  Tiempo completo
                </Badge>
                <Badge
                  className="flex items-center gap-1"
                  variant="destructive"
                >
                  <IconFlame size={14} data-icon="inline-start" />
                  Urgente
                </Badge>
                <Badge className="flex items-center gap-1" variant="secondary">
                  <IconMoon size={14} data-icon="inline-start" />
                  Turno nocturno
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-md bg-muted">
                    <IconCurrencyDollar size={18} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Rango salarial
                  </p>
                </div>
                <p className="text-xl font-bold">
                  {formatSalary(job.salaryMin, job.salaryCurrency)} -{" "}
                  {formatSalary(job.salaryMax, job.salaryCurrency)} /mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-md bg-muted">
                    <IconBriefcase size={18} />
                  </div>
                  <p className="text-sm text-muted-foreground">Experiencia</p>
                </div>
                <p className="text-xl font-bold">2+ Años</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-md bg-muted">
                    <IconCalendarTime size={18} />
                  </div>
                  <p className="text-sm text-muted-foreground">Turno</p>
                </div>
                <p className="text-xl font-bold">Nocturno / 12hr</p>
              </CardContent>
            </Card>
          </div>

          {/* Description + Accordion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                Acerca de la posición
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-base leading-relaxed text-muted-foreground">
                {job.description}
              </p>

              <Accordion
                type="single"
                collapsible
                className="rounded-lg border"
              >
                <AccordionItem
                  value="responsabilidades"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <IconStethoscope size={18} />
                      </div>
                      <span className="text-lg font-bold">
                        Responsabilidades
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Monitor patient vitals...</li>
                      <li>Administer medications...</li>
                      <li>Maintain records...</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="requerimientos"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <IconChecklist size={18} />
                      </div>
                      <span className="text-lg font-bold">Requerimientos</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>BSN degree preferred</li>
                      <li>Active RN license</li>
                      <li>2+ years ICU</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="beneficios"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <IconGift size={18} />
                      </div>
                      <span className="text-lg font-bold">Beneficios</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Health insurance</li>
                      <li>401k</li>
                      <li>PTO</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            {/* CTA */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold">¿Listo para aplicar?</h3>
                <p className="text-sm text-muted-foreground">
                  Por favor revisa los requisitos antes de aplicar.
                </p>
                {/* <Button className="w-full">Aplicar ahora</Button> */}
                {/* TODO: Probar botón para aprobar. */}
                <ApplySection
                  jobId={job.id}
                  alreadyApplied={job.alreadyApplied}
                />
                <SaveJob jobId={job.id} alreadySaved={job.alreadyApplied} />
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <IconLock size={14} />
                  No compartiremos tu información
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            {/* TODO: Poner un mapa de Google y el botón de abrir mapa. Con API KEY de Google u otra librería con soporte.
                https://fazt.dev/contenido/a%C3%B1ade-mapas-de-google-a-react-y-nextjs
                npm install @googlemaps/js-api-loader
            */}
            {job?.organization && (
              <Card>
                <div className="h-40 w-full bg-muted relative">
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs">
                    <IconMapPin size={14} />
                    Cleveland, OH
                  </div>
                </div>
                <CardContent className="p-5">
                  <h4 className="font-bold">{job.organization.name}</h4>

                  {/* TODO: Mostrar ubicación de sucursal o alguna dirección de la vacante. */}
                  <p className="text-sm text-muted-foreground">
                    2500 MetroHealth Dr, Cleveland, OH
                  </p>

                  {/* TODO: Abrir aplicación de Google Maps. */}
                  <Button variant="link" className="p-0 mt-2">
                    Abrir mapa
                    <IconExternalLink size={14} />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
