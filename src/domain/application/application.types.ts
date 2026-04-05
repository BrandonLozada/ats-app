export interface Application {
  id: string;
  candidateId: string;
  jobPostingId: string;
  stageId?: string | null;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicationDTO {
  candidateId: string;
  jobPostingId: string;
  userId?: string;
}

export interface MoveStageDTO {
  applicationId: string;
  toStageId: string;
  userId?: string;
  notes?: string;
}
