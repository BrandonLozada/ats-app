import { CreateJobForm } from "./components/create-job-form";
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

// TODO: Validar por qué está aplicando esta técnica de crear un borrador de job al entrar a la página de creación de job, en vez de crear el job directamente al hacer submit del formulario.
// Esto hace que tengamos un job "fantasma" creado cada vez que alguien entra a la página de creación, lo cual puede ser problemático si alguien entra por error o no completa el proceso de creación.
// Quizás sería mejor crear el job directamente al hacer submit del formulario, y redirigir a la página de edición con el ID del nuevo job creado.
// import { createJobDraftAction } from "../actions/create-job-draft.action";
// import { redirect } from "next/navigation";

// export default async function NewJobPage() {
//   const job = await createJobDraftAction();

//   redirect(`/admin/jobs/${job.id}/edit`);
// }
