"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import {
  stepBasicSchema,
  StepBasicValues,
} from "@/ui/schemas/job-posting/step-basic.schema";
import { updateJobAction } from "../actions/update-job.action";
import { SelectOption } from "@/interfaces/ui/types/types";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";

interface StepBasicProps {
  jobId: string;
  job: JobWizardUI;
  employmentTypeOptions: SelectOption[];
  categoryOptions: SelectOption[];
  departmentOptions: SelectOption[];
  pipelineOptions: SelectOption[];
  onNext: () => void;
}

export function StepBasic({
  jobId,
  job,
  employmentTypeOptions,
  categoryOptions,
  departmentOptions,
  pipelineOptions,
  onNext,
}: StepBasicProps) {
  const action = "Guardar y continuar";

  const defaultValues: StepBasicValues = {
    title: job.title,
    slug: job.slug,
    description: job.description,
    employmentType: job.employmentType as StepBasicValues["employmentType"],
    categoryId: job.categoryId,
    departmentId: job.departmentId ?? undefined,
    pipelineId: job.pipelineId,
  };

  const form = useForm<StepBasicValues>({
    resolver: zodResolver(stepBasicSchema),
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const isMutating = isSubmitting;

  async function onSubmit(values: StepBasicValues) {
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
          {/* Título */}
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="title">Título de la vacante</FieldLabel>
                <Input
                  {...field}
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. Enfermera Generalista"
                  disabled={isMutating}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Ruta personalizada */}
          <Controller
            control={control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Ruta personalizada</FieldLabel>
                <Input
                  {...field}
                  placeholder="Ej. enfermera-generalista"
                  disabled={isMutating}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Descripción */}
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Descripción</FieldLabel>
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

          {/* Relación laboral */}
          <Controller
            name="employmentType"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Relación laboral</FieldLabel>
                <Select
                  disabled={isMutating}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypeOptions.map((employmentType) => (
                      <SelectItem
                        key={employmentType.value}
                        value={employmentType.value}
                      >
                        {employmentType.label}
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

          {/* Categoría */}
          <Controller
            name="categoryId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Categoría</FieldLabel>
                <Select
                  disabled={isMutating}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
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

          {/* Departamento */}
          <Controller
            name="departmentId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Departamento</FieldLabel>
                <FieldDescription>
                  Agrupa la vacante dentro de un departamento.
                </FieldDescription>
                <Select
                  disabled={isMutating}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((department) => (
                      <SelectItem
                        key={department.value}
                        value={department.value}
                      >
                        {department.label}
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

          {/* Pipeline */}
          <Controller
            name="pipelineId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Proceso de la vacante</FieldLabel>
                <FieldDescription>
                  Selecciona el proceso de evolución de la vacante.
                </FieldDescription>
                <Select
                  disabled={isMutating}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineOptions.map((pipeline) => (
                      <SelectItem key={pipeline.value} value={pipeline.value}>
                        {pipeline.label}
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
