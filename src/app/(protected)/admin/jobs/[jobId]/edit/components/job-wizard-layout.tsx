"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JobWizardUI } from "@/interfaces/ui/types/jobs/job.types";

interface JobWizardLayoutProps {
  title: string;
  job: JobWizardUI;
  currentStepLabel: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function JobWizardLayout({
  title,
  job,
  currentStepLabel,
  // onAction,
  children,
}: JobWizardLayoutProps) {
  const router = useRouter();

  const handleSaveGoBack = () => {
    // TODO: Aplicar el guardado con el use-case, un prop emit para mandar los parámetros.
    router.push(`/admin/jobs/${job.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {title}: {job.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Paso actual: {currentStepLabel}
          </p>
        </div>
        {/* {onAction && <Button onClick={onAction}>Actualizar vacante</Button>} */}
        <Button variant={"default"} onClick={handleSaveGoBack}>
          Actualizar y volver
        </Button>
      </div>

      <Separator />

      {/* Contenido dinámico */}
      <div>{children}</div>
    </div>
  );
}
