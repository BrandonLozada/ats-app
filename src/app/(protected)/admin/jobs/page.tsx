import { JobClient } from "./components/client";
import { getJobItems } from "@/application/job-posting/queries/get-job-items.query";

export default async function JobsPage() {
  const jobs = await getJobItems();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6 overflow-x-auto">
        <JobClient data={jobs} />
      </div>
    </div>
  );
}
