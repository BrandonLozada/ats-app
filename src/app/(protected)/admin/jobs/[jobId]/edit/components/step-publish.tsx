"use client";

import { useRouter } from "next/navigation";
import { IconAlertTriangle, IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { publishJobAction } from "../actions/publish-job.action";
import { formatterCurrency } from "@/lib/utils";
import { APP_NAME, COMPANY_DOMAIN, SITE_URL } from "@/config/app";
import { JobPreviewUI } from "@/interfaces/ui/types/jobs/job.types";
import { useTransition } from "react";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";

interface StepPublishProps {
  jobId: string;
  job: JobPreviewUI;
}

// TODO: Aplicar mejoras de UX UI para cada paso correspondiente (Google Stitch), no es necesario tanto icono y tanta tarjeta.
export function StepPublish({ jobId, job }: StepPublishProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const action = "Publicar vacante";

  const handleGoBack = () => {
    router.back();
  };

  const onSubmit = () => {
    startTransition(async () => {
      await publishJobAction(jobId);
    });
  };

  const hasSalary = job.salaryMin != null && job.salaryMax != null;

  return (
    <>
      <div className="w-full space-y-4">
        <h1>Finalizar y publicar</h1>
        <div>
          Revisa el resumen de la vacante antes de que sea visible para los
          candidatos.
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ALERTA */}
            <Alert className="w-full border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <IconAlertTriangle />
              <AlertTitle>
                Revisa cuidadosamente la información antes de publicar.
              </AlertTitle>
              <AlertDescription className="text-wrap">
                Una vez publicada, la vacante será visible en el portal{" "}
                {APP_NAME} y comenzará a recibir postulaciones de inmediato.
              </AlertDescription>
            </Alert>

            {/* HEADER PREVIEW */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{job.title}</h2>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="uppercase">
                  {job.employmentType}
                </Badge>

                {job.seniorityLevel && (
                  <Badge variant="outline" className="uppercase">
                    {job.seniorityLevel}
                  </Badge>
                )}

                {job.isRemote && <Badge className="uppercase">Remoto</Badge>}
              </div>
            </div>

            <Separator />

            {/* CONTENIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Accordion type="multiple" className="w-full rounded-lg border">
                {/* DETALLES */}
                <AccordionItem
                  value="details"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        Detalles del puesto
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Categoría:</span>{" "}
                      {job.category}
                    </p>

                    {job.department && (
                      <p>
                        <span className="font-medium">Departamento:</span>{" "}
                        {job.department}
                      </p>
                    )}

                    <p>
                      <span className="font-medium">Pipeline:</span>{" "}
                      {job.pipeline}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* DESCRIPCIÓN */}
                <AccordionItem
                  value="description"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">Descripción</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    {job.description && <p>{job.description}</p>}

                    {job.responsibilities && (
                      <div>
                        <h4 className="font-medium">Responsabilidades</h4>
                        <p>{job.responsibilities}</p>
                      </div>
                    )}

                    {job.requirements && (
                      <div>
                        <h4 className="font-medium">Requisitos</h4>
                        <p>{job.requirements}</p>
                      </div>
                    )}

                    {job.benefits && (
                      <div>
                        <h4 className="font-medium">Beneficios</h4>
                        <p>{job.benefits}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* SALARIO */}
                <AccordionItem
                  value="salary"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">Salario</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm">
                    {hasSalary ? (
                      <p>
                        {job.salaryCurrency}:{" "}
                        {job.salaryMin && job.salaryMax
                          ? formatterCurrency.formatRange(
                              Number(job.salaryMin),
                              Number(job.salaryMax),
                            )
                          : "No especificado"}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Salario no especificado
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* SEO */}
                <AccordionItem
                  value="seo"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        Vista previa en buscadores
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted/30 p-6 rounded-xl border border-outline-variant border-opacity-10">
                      <div className="flex items-center gap-2 mb-4 text-outline">
                        <IconSearch />
                        <h4 className="font-bold uppercase text-xs tracking-widest">
                          Previsualización SEO
                        </h4>
                      </div>
                      <p className="text-blue-700 text-sm font-medium hover:underline cursor-pointer truncate">
                        {job.metaTitle || job.title}
                      </p>
                      <p className="text-emerald-700 text-xs">
                        https://{COMPANY_DOMAIN || SITE_URL}/jobs/{job.slug}...
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {job.metaDescription || "Sin descripción definida"}
                        ...
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* CONFIG */}
                <AccordionItem
                  value="config"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">Configuración</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>
                      <span className="font-medium">Indexación:</span>{" "}
                      {job.noIndex ? "No indexado" : "Indexado"}
                    </p>

                    {job.applyUrl && (
                      <p>
                        <span className="font-medium">URL de aplicación:</span>{" "}
                        {job.applyUrl}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Accordion type="multiple" className="w-full rounded-lg border">
                {/* SEO */}
                <AccordionItem
                  value="seo"
                  className="border-b px-4 last:border-b-0"
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        Vista previa en buscadores
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted/30 p-6 rounded-xl border border-outline-variant border-opacity-10">
                      <div className="flex items-center gap-2 mb-4 text-outline">
                        <IconSearch />
                        <h4 className="font-bold text-xs tracking-widest">
                          Previsualización SEO
                        </h4>
                      </div>
                      <p className="text-blue-700 text-sm font-medium hover:underline cursor-pointer truncate">
                        {job.metaTitle || job.title}
                      </p>
                      <p className="text-emerald-700 text-xs">
                        https://{COMPANY_DOMAIN || SITE_URL}/jobs/{job.slug}...
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {job.metaDescription || "Sin descripción definida"}
                        ...
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              <div className="flex text-sm text-muted-foreground">
                Esta acción hará visible la vacante públicamente.
              </div>

              {/* ACCIÓN */}
              <form onSubmit={onSubmit} className="flex">
                <FieldGroup>
                  <div className="flex justify-end gap-4">
                    <Field>
                      <Button
                        type="button"
                        variant={"secondary"}
                        onClick={handleGoBack}
                      >
                        Atrás
                      </Button>
                    </Field>
                    <Field>
                      <SubmitButton disabled={pending} isSubmitting={pending}>
                        {action}
                      </SubmitButton>
                    </Field>
                  </div>
                </FieldGroup>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
