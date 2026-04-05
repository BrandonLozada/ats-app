export function ensureNotDuplicated(existing: any) {
  if (existing) {
    throw new Error("Candidate already applied to this job");
  }
}

export function ensureJobIsOpen(job: any) {
  if (!job || job.status !== "PUBLISHED") {
    throw new Error("Job is not open for applications");
  }
}
