import Link from "next/link";

interface JobListItemProps {
  job: {
    id: string;
    title: string;
    organizationName: string | null;
    location?: string;
  };
  selected: boolean;
}

export default function JobListItem({ job, selected }: JobListItemProps) {
  return (
    <Link
      key={job.id}
      href={`?jobId=${job.id}`}
      // href={{
      //   pathname: "/jobs",
      //   query: { jobId: job.id },
      // }}
      className={`block p-4 border-b ${selected ? "bg-muted" : ""}`}
    >
      <h3>{job.title}</h3>
      <p className="text-sm">{job.organizationName}</p>
      <p className="text-sm text-muted-foreground">{job.location}</p>
    </Link>
  );
}
