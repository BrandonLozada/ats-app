import { CreateJobForm } from "../components/create-job-form";
import { getCategoryOptionsList } from "@/application/job-posting/queries/get-category-options.query";
import { getDepartmentOptionsList } from "@/application/job-posting/queries/get-department-options.query";
import { getPipelineOptionsList } from "@/application/job-posting/queries/get-pipeline-options.query";
import { toOption } from "@/application/shared/mappers/to-option";

export default async function NewJobPage() {
  const [categories, departments, pipelines] = await Promise.all([
    getCategoryOptionsList(),
    getDepartmentOptionsList(),
    getPipelineOptionsList(),
  ]);

  const categoryOptions = toOption(categories);
  const departmentOptions = toOption(departments);
  const pipelineOptions = toOption(pipelines);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CreateJobForm
          categoryOptions={categoryOptions}
          departmentOptions={departmentOptions}
          pipelineOptions={pipelineOptions}
        />
      </div>
    </div>
  );
}
