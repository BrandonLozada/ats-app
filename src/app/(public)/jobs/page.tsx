import { getJobs, getJobById } from "@/interfaces/http/actions/job.actions";
import JobLayout from "./components/job-layout";
import JobList from "./components/job-list";
import JobClient from "./[jobId]/components/client";
import EmptyJobSelection from "./components/empty-job-selection";

type JobPageProps = {
  searchParams: Promise<{
    jobId?: string;
    search?: string;
    employmentType?: string;
    organizationId?: string;
  }>;
};

export default async function JobsPage({ searchParams }: JobPageProps) {
  const { jobId, search, employmentType, organizationId } = await searchParams;

  const jobs = await getJobs({
    search,
    employmentType,
    organizationId,
  });

  // TODO: Reemplazar el userId hardcodeado por el del usuario autenticado.
  const selectedJob = jobId
    ? await getJobById({
        jobId,
        userId: "b7cfa971-6803-4228-be41-4701159c4b3f", // userId: session?.user?.id,
      })
    : null;

  return (
    <JobLayout
      list={<JobList jobs={jobs} selectedJobId={jobId} />}
      detail={
        selectedJob ? <JobClient job={selectedJob} /> : <EmptyJobSelection />
      }
    />
  );
}
