import { notFound } from "next/navigation";

import { getJobById } from "@/application/job-posting/queries/get-job-by-id.query";
import { getEmploymentType } from "@/application/job-posting/queries/get-employment-type.query";
import { getCategoryOptionsList } from "@/application/job-posting/queries/get-category-options.query";
import { getDepartmentOptionsList } from "@/application/job-posting/queries/get-department-options.query";
import { getPipelineOptionsList } from "@/application/job-posting/queries/get-pipeline-options.query";
import { getSeniorityLevel } from "@/application/job-posting/queries/get-seniority-level.query";
import { getBranchOptionsList } from "@/application/job-posting/queries/get-branch-options.query";
import { toOption } from "@/application/shared/mappers/to-option";
import { JobWizard } from "./components/job-wizard";
import { getJobPreviewById } from "@/application/job-posting/queries/get-job-preview-by-id.query";

type Params = Promise<{ jobId: string }>;
type SearchParams = Promise<{ step?: string }>;

type JobWizardPageProps = {
  params: Params;
  searchParams?: SearchParams;
};

export default async function JobWizardPage({
  params,
  searchParams,
}: JobWizardPageProps) {
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const { step } = resolvedSearchParams ?? {};

  if (!jobId) {
    notFound();
  }

  let jobPreview = null;

  if (step === "publish") {
    jobPreview = await getJobPreviewById(jobId);

    // TODO: Borrar mensaje de consola.
    console.log("\njobPreview: ", jobPreview);
  }

  const job = await getJobById(jobId);

  // TODO: Borrar mensaje de consola.
  console.log("\njob: ", job);

  if (!job) {
    notFound();
  }

  const [categories, departments, pipelines, branches] = await Promise.all([
    getCategoryOptionsList(),
    getDepartmentOptionsList(),
    getPipelineOptionsList(),
    getBranchOptionsList(),
  ]);

  const employmentTypeOptions = getEmploymentType();
  const categoryOptions = toOption(categories);
  const departmentOptions = toOption(departments);
  const pipelineOptions = toOption(pipelines);
  const seniorityLevelOptions = getSeniorityLevel();
  const branchOptions = toOption(branches);
  const currencyOptions = [
    { value: "MXN", label: "Peso mexicano (MXN)" },
    { value: "USD", label: "Dólar estadounidense (USD)" },
  ];

  return (
    <JobWizard
      jobId={jobId}
      job={job}
      jobPreview={jobPreview}
      employmentTypeOptions={employmentTypeOptions}
      categoryOptions={categoryOptions}
      departmentOptions={departmentOptions}
      pipelineOptions={pipelineOptions}
      seniorityLevelOptions={seniorityLevelOptions}
      currencyOptions={currencyOptions}
      branchOptions={branchOptions}
    />
  );
}
