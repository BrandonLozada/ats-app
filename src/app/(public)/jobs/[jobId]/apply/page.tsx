import { notFound, redirect } from "next/navigation";

import { getJobById } from "@/interfaces/http/actions/job.actions";

type Params = Promise<{ jobId: string }>;

export default async function ApplyJob({ params }: { params: Params }) {
  const { jobId } = await params;

  const job = await getJobById({
    jobId,
    userId: "b7cfa971-6803-4228-be41-4701159c4b3f", // userId: session?.user?.id,
  });

  if (!job) {
    notFound();
  }

  // TODO: Verificar si el usuario ha completado el onboarding requerido para aplicar a la vacante.
  // redirect(`/onboarding/required?redirect=/jobs/${jobId}`);

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full flex-col items-center justify-between sm:items-start">
        ApplyJob
      </main>
    </div>
  );
}
