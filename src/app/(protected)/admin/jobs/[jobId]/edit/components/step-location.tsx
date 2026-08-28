"use client";

import { useForm } from "react-hook-form";

import { updateJobAction } from "../actions/update-job.action";
import { SelectOption } from "@/interfaces/ui/types/types";
import { Button } from "@/components/ui/button";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";

interface StepLocationProps {
  jobId: string;
  job: JobWizardUI;
  branchOptions: SelectOption[];
  onNext: () => void;
}

export interface StepLocationValues {
  isRemote?: boolean;
  branchIds?: string[];
}

// TODO: Completar este formulario.
export function StepLocation({
  jobId,
  job,
  branchOptions,
  onNext,
}: StepLocationProps) {
  const form = useForm<StepLocationValues>();

  const { handleSubmit, register } = form;

  async function onSubmit(values: StepLocationValues) {
    await updateJobAction({
      jobId,
      isRemote: values.isRemote,
      // branches se maneja aparte si es m:n
    });

    // ⚠️ branches → normalmente otro endpoint
    // (connect / disconnect)

    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <label>
        <input type="checkbox" {...register("isRemote")} />
        Trabajo remoto
      </label>

      <div>
        <p>Sucursales</p>
        {branchOptions.map((branch) => (
          <label key={branch.value}>
            <input
              type="checkbox"
              value={branch.value}
              {...register("branchIds")}
            />
            {branch.label}
          </label>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <Button variant={"outline"}>Atras</Button>
        <Button variant={"secondary"}>Omitir</Button>

        <Button variant={"default"} type="submit">
          Guardar y continuar
        </Button>
      </div>
    </form>
  );
}
