import JobLayout from "./components/job-layout";
import JobListSkeleton from "./components/job-list-skeleton";

export default function Loading() {
  return (
    <JobLayout
      list={<JobListSkeleton count={7} />}
      detail={
        <div className="p-6">
          {/* TODO: Aplicar otro skeleton después. */}
        </div>
      }
    />
  );
}