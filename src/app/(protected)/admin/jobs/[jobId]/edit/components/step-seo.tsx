"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import {
  stepSeoSchema,
  StepSeoValues,
} from "@/ui/schemas/job-posting/step-seo.schema";
import { updateJobAction } from "../actions/update-job.action";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";

interface StepSeoProps {
  jobId: string;
  job: JobWizardUI;
  onNext: () => void;
}

// TODO: Aplicar mejoras de UX UI para cada paso correspondiente (Google Stitch), no es necesario tanto icono y tanta tarjeta.
export function StepSeo({ jobId, job, onNext }: StepSeoProps) {
  const action = "Guardar y continuar";

  const defaultValues: StepSeoValues = {
    metaTitle: job.metaTitle ?? "",
    metaDescription: job.metaDescription ?? "",
    noIndex: job.noIndex ?? false,
  };
  const form = useForm<StepSeoValues>({
    resolver: zodResolver(stepSeoSchema),
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const isMutating = isSubmitting;

  async function onSubmit(values: StepSeoValues) {
    await updateJobAction({
      jobId,
      ...values,
    });

    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
      <FieldGroup>
        <div className="space-y-8">
          {/* Meta title */}
          <Controller
            control={control}
            name="metaTitle"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Meta title</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Ej. Desarrollador Full Stack en Monterrey"
                  disabled={isMutating}
                  className="resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Meta description */}
          <Controller
            control={control}
            name="metaDescription"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Meta description</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Describe brevemente la vacante para buscadores..."
                  disabled={isMutating}
                  className="resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* No index */}
          <Controller
            control={control}
            name="noIndex"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldContent>
                  <FieldLabel>No indexar en buscadores</FieldLabel>
                  <FieldDescription>
                    Evita que esta vacante aparezca en Google u otros
                    buscadores.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <SubmitButton isSubmitting={isSubmitting}>{action}</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
