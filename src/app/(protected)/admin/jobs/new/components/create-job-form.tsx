"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/heading";
import { SubmitButton } from "@/components/submit-button";
import { createJobAction } from "../../actions/create-job.action";
import {
  CreateJobFormValues,
  createJobFormSchema,
} from "@/ui/schemas/job-posting/create-job-form.schema";
import { SelectOption } from "@/interfaces/ui/types/types";

interface CreateJobFormProps {
  categoryOptions: SelectOption[];
  departmentOptions: SelectOption[];
  pipelineOptions: SelectOption[];
}

export function CreateJobForm({
  categoryOptions,
  departmentOptions,
  pipelineOptions,
}: CreateJobFormProps) {
  const router = useRouter();

  const title = "Crear vacante";
  const description = "Agrega una nuevo vacante";
  const toastMessage = "Vacante creada.";
  const action = "Crear";

  const defaultValues: CreateJobFormValues = {
    title: "",
    slug: "",
    description: "",
    employmentType: "FULL_TIME",
    categoryId: "",
    departmentId: undefined,
    pipelineId: "",
  };

  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, isDirty },
  } = form;

  const isMutating = isSubmitting;

  async function onSubmit(values: CreateJobFormValues) {
    try {
      await createJobAction(values);
      toast.success(toastMessage);
      router.push("/admin/jobs");
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        "Error al crear la vacante. Por favor, inténtalo de nuevo más tarde.",
      );
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Tipo de empleo */}
            {/* TODO: Agregar los demás tipos de empleo pendientes. */}
            <Controller
              name="employmentType"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Tipo de empleo</FieldLabel>
                  <FieldDescription>
                    Selecciona el tipo de empleo.
                  </FieldDescription>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isMutating}
                    className={
                      isMutating ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FULL_TIME" id="full_time" />
                      <Label htmlFor="full_time">Tiempo completo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PART_TIME" id="part_time" />
                      <Label htmlFor="part_time">Medio tiempo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CONTRACTOR" id="contractor" />
                      <Label htmlFor="contractor">
                        Tiempo definido/Contrato
                      </Label>
                    </div>
                  </RadioGroup>
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
          <div className="flex justify-end">
            <Field>
              <SubmitButton
                disabled={!isDirty || isMutating}
                isSubmitting={isMutating}
              >
                {action}
              </SubmitButton>
            </Field>
          </div>
        </FieldGroup>
      </form>
    </>
  );
}
