import { notFound } from "next/navigation";

import { getJobById } from "@/interfaces/http/actions/job.actions";
import JobClient from "./components/client";

type Params = Promise<{ jobId: string }>;

export default async function JobPage({ params }: { params: Params }) {
  const { jobId } = await params;

  // TODO: Reemplazar el userId hardcodeado por el del usuario autenticado.
  const job = await getJobById({
    jobId,
    userId: "b7cfa971-6803-4228-be41-4701159c4b3f", // userId: session?.user?.id,
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="flex items-center justify-center font-sans">
      <main className="w-full flex flex-col items-center justify-between sm:items-start">
        <JobClient job={job} />
      </main>
    </div>
  );
}
