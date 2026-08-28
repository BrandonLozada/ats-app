type Job = {
  title: string;
  description: string;
  pipelineId: string;
};

export function validatePublishable(job: Job) {
  const errors: string[] = [];

  if (!job.title) errors.push("title");
  if (!job.description) errors.push("description");
  if (!job.pipelineId) errors.push("pipeline");

  if (errors.length > 0) {
    throw new Error(`Missing required fields: ${errors.join(", ")}`);
  }
}
