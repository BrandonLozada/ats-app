import JobListItem from "./job-list-item";

interface JobListProps {
  jobs: {
    id: string;
    title: string;
    organizationName: string | null;
    location?: string;
  }[];
  selectedJobId?: string;
}

export default function JobList({ jobs, selectedJobId }: JobListProps) {
  return jobs.map((job) => (
    <JobListItem key={job.id} job={job} selected={job.id === selectedJobId} />
  ));
}
