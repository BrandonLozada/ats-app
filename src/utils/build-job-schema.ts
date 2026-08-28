interface Job {
  title: string;
  description: string;
  publishedAt: string;
  validThrough: string;
  employmentType: string;
  organization: {
    name: string;
  };
}

export function buildJobSchema(job: Job) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.publishedAt,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {
      name: job.organization.name,
    },
  };
}
