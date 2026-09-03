"use client";

import { useForm } from "react-hook-form";

import { updateJobAction } from "../actions/update-job.action";
import { Button } from "@/components/ui/button";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";

interface StepLocationProps {
  jobId: string;
  job: JobWizardUI;
  onNext: () => void;
}

export interface StepLocationValues {
  isRemote?: boolean;
}

export function StepLocation({
  jobId,
  job,
  onNext,
}: StepLocationProps) {
  const form = useForm<StepLocationValues>({
    defaultValues: {
      isRemote: job.isRemote,
    },
  });

  const { handleSubmit, register } = form;

  async function onSubmit(values: StepLocationValues) {
    await updateJobAction({
      jobId,
      isRemote: values.isRemote,
    });

    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("isRemote")} />
        Trabajo remoto
      </label>

      <div className="flex justify-between gap-2">
        <Button variant={"outline"} type="button">Atras</Button>
        <Button variant={"secondary"} type="button">Omitir</Button>

        <Button variant={"default"} type="submit">
          Guardar y continuar
        </Button>
      </div>
    </form>
  );
}
