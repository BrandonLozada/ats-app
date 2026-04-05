export const PERMISSIONS = {
  APPLICATION_CREATE: "application.create",
  APPLICATION_MOVE_STAGE: "application.move_stage",
  APPLICATION_READ: "application.read",

  CANDIDATE_CREATE: "candidate.create",
  CANDIDATE_UPDATE: "candidate.update",

  JOB_CREATE: "job.create",
  JOB_UPDATE: "job.update",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
