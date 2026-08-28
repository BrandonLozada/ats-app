"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { JobWizardLayout } from "./job-wizard-layout";
import { StepBasic } from "./step-basic";
import { StepDetails } from "./step-details";
import { StepSalary } from "./step-salary";
import { StepSeo } from "./step-seo";
import { StepLocation } from "./step-location";
import { StepPublish } from "./step-publish";
import { WizardSidebar } from "./wizard-sidebar";
import {
  JobPreviewUI,
  JobWizardUI,
} from "@/interfaces/ui/types/jobs/job.types";
import { SelectOption } from "@/interfaces/ui/types/types";
import { stepsDictionary } from "./steps";

interface JobWizardProps {
  jobId: string;
  job: JobWizardUI;
  jobPreview?: JobPreviewUI | null;
  employmentTypeOptions: SelectOption[];
  categoryOptions: SelectOption[];
  departmentOptions: SelectOption[];
  pipelineOptions: SelectOption[];
  seniorityLevelOptions: SelectOption[];
  currencyOptions: SelectOption[];
  branchOptions: SelectOption[];
}

export function JobWizard({
  jobId,
  job,
  jobPreview,
  employmentTypeOptions,
  categoryOptions,
  departmentOptions,
  pipelineOptions,
  seniorityLevelOptions,
  currencyOptions,
  branchOptions,
}: JobWizardProps) {
  const params = useSearchParams();
  const router = useRouter();

  const step = params.get("step") ?? "basic";

  function goTo(next: string) {
    router.push(`?step=${next}`);
  }

  return (
    <JobWizardLayout
      title="Editar vacante"
      job={job}
      currentStepLabel={stepsDictionary[step]}
      // TODO: Borrar mensaje de consola.
      onAction={() => console.log("Actualizar vacante")}
    >
      <div className="flex flex-col md:grid md:grid-cols-4 md:gap-8">
        {/* Sidebar: en desktop a la izquierda, en mobile arriba */}
        <div className="md:col-span-1 mb-4 md:mb-0">
          <WizardSidebar currentStep={step} onNavigate={goTo} />
        </div>
        {/* Contenido de pasos */}
        <div className="md:col-span-3">
          {step === "basic" && (
            <StepBasic
              jobId={jobId}
              job={job}
              employmentTypeOptions={employmentTypeOptions}
              categoryOptions={categoryOptions}
              departmentOptions={departmentOptions}
              pipelineOptions={pipelineOptions}
              onNext={() => goTo("details")}
            />
          )}
          {step === "details" && (
            <StepDetails
              jobId={jobId}
              job={job}
              seniorityLevelOptions={seniorityLevelOptions}
              onNext={() => goTo("salary")}
            />
          )}
          {step === "salary" && (
            <StepSalary
              jobId={jobId}
              job={job}
              currencyOptions={currencyOptions}
              onNext={() => goTo("location")}
            />
          )}
          {step === "location" && (
            <StepLocation
              jobId={jobId}
              job={job}
              branchOptions={branchOptions}
              onNext={() => goTo("seo")}
            />
          )}
          {step === "seo" && (
            <StepSeo jobId={jobId} job={job} onNext={() => goTo("publish")} />
          )}
          {step === "publish" && jobPreview && (
            <StepPublish jobId={jobId} job={jobPreview} />
          )}
        </div>
      </div>
    </JobWizardLayout>
  );
}
