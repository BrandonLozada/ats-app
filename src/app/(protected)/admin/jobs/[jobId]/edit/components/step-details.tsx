"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  stepDetailsSchema,
  StepDetailsValues,
} from "@/ui/schemas/job-posting/step-details.schema";
import { updateJobAction } from "../actions/update-job.action";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";
import { SubmitButton } from "@/components/submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectOption } from "@/interfaces/ui/types/types";

interface StepDetailsProps {
  jobId: string;
  job: JobWizardUI;
  seniorityLevelOptions: SelectOption[];
  onNext: () => void;
}

export function StepDetails({
  jobId,
  job,
  seniorityLevelOptions,
  onNext,
}: StepDetailsProps) {
  const action = "Guardar y continuar";

  const defaultValues: StepDetailsValues = {
    responsibilities: job.responsibilities ?? undefined,
    requirements: job.requirements ?? undefined,
    benefits: job.benefits ?? undefined,
    seniorityLevel: job.seniorityLevel as StepDetailsValues["seniorityLevel"],
  };

  const form = useForm<StepDetailsValues>({
    resolver: zodResolver(stepDetailsSchema),
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const isMutating = isSubmitting;

  async function onSubmit(values: StepDetailsValues) {
    await updateJobAction({
      jobId,
      ...values,
    });

    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
      <FieldGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Responsabilidades */}
          <Controller
            control={control}
            name="responsibilities"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Responsabilidades</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Ej. Atención a pacientes..."
                  disabled={isMutating}
                  className="resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Requisitos */}
          <Controller
            control={control}
            name="requirements"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Requisitos</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Ej. Título profesional requerido..."
                  disabled={isMutating}
                  className="resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Beneficios */}
          <Controller
            control={control}
            name="benefits"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Beneficios</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Ej. Bono de despensa..."
                  disabled={isMutating}
                  className="resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Nivel de experiencia */}
          <Controller
            name="seniorityLevel"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Nivel de experiencia</FieldLabel>
                <Select
                  disabled={isMutating}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {seniorityLevelOptions.map((seniorityLevel) => (
                      <SelectItem
                        key={seniorityLevel.value}
                        value={seniorityLevel.value}
                      >
                        {seniorityLevel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <Field>
            <SubmitButton disabled={isMutating} isSubmitting={isMutating}>
              {action}
            </SubmitButton>
          </Field>
        </div>
      </FieldGroup>
    </form>
  );
}
