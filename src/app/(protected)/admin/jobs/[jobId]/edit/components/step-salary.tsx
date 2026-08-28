"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import {
  StepSalaryOutput,
  stepSalarySchema,
  StepSalaryValues,
} from "@/ui/schemas/job-posting/step-salary.schema";
import { updateJobAction } from "../actions/update-job.action";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";
import { SelectOption } from "@/interfaces/ui/types/types";
import { formatterCurrency } from "@/lib/utils";

interface StepSalaryProps {
  jobId: string;
  job: JobWizardUI;
  currencyOptions: SelectOption[];
  onNext: () => void;
}

export function StepSalary({
  jobId,
  job,
  currencyOptions,
  onNext,
}: StepSalaryProps) {
  const action = "Guardar y continuar";

  const defaultValues: StepSalaryValues = {
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : "",
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : "",
    salaryCurrency: job.salaryCurrency ?? "",
  };

  const form = useForm<StepSalaryValues>({
    resolver: zodResolver(stepSalarySchema),
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = form;

  const isMutating = isSubmitting;

  // eslint-disable-next-line react-hooks/incompatible-library
  const salaryMin = watch("salaryMin");
  const salaryMax = watch("salaryMax");
  const currency = watch("salaryCurrency");

  async function onSubmit(values: StepSalaryOutput) {
    await updateJobAction({
      jobId,
      salaryMin: values.salaryMin ? Number(values.salaryMin) : null,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : null,
      salaryCurrency: values.salaryCurrency,
    });

    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
      <FieldGroup>
        <div className="space-y-6">
          {/* Header */}
          <Field>
            <FieldLabel>Rango salarial mensual</FieldLabel>
            <FieldDescription>
              Define un rango estimado. No necesita ser exacto, se formaliza en
              contrato.
            </FieldDescription>
            <FieldDescription>
              {currency}:{" "}
              {salaryMin && salaryMax
                ? formatterCurrency.formatRange(
                    Number(salaryMin),
                    Number(salaryMax),
                  )
                : "No especificado"}
            </FieldDescription>
          </Field>

          {/* Grid principal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Moneda */}
            <Controller
              name="salaryCurrency"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Moneda</FieldLabel>
                  <Select
                    disabled={isMutating}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="MXN" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
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

            {/* Mínimo */}
            <Controller
              control={control}
              name="salaryMin"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Mínimo</FieldLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      // permitir vacío (CLAVE)
                      if (value === "") {
                        field.onChange("");
                        return;
                      }

                      // solo enteros
                      if (/^\d+$/.test(value)) {
                        field.onChange(value);
                      }
                    }}
                    disabled={isMutating}
                    placeholder="5000"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Máximo */}
            <Controller
              control={control}
              name="salaryMax"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Máximo</FieldLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      // permitir vacío (CLAVE)
                      if (value === "") {
                        field.onChange("");
                        return;
                      }

                      // solo enteros
                      if (/^\d+$/.test(value)) {
                        field.onChange(value);
                      }
                    }}
                    disabled={isMutating}
                    placeholder="5000"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <SubmitButton disabled={isMutating} isSubmitting={isMutating}>
            {action}
          </SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
