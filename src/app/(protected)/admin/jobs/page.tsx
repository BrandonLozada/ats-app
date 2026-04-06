import { JobClient } from "./components/client";
import { getJobPostingsItems } from "@/application/job-posting/queries/get-job-postings-items.query";

export default async function JobsPage() {
  const jobs = await getJobPostingsItems();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6 overflow-x-auto">
        <JobClient data={jobs} />
      </div>
    </div>
  );
}
