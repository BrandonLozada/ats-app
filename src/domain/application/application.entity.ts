export type ApplicationEvent =
  | {
      type: "APPLICATION_CREATED";
      payload: {
        applicationId: string;
        candidateId: string;
        jobPostingId: string;
      };
    }
  | {
      type: "STAGE_MOVED";
      payload: {
        applicationId: string;
        fromStageId?: string | null;
        toStageId: string;
        movedById?: string;
      };
    }
  | {
      type: "INTERVIEW_SCHEDULED";
      payload: {
        applicationId: string;
        stageId?: string;
        scheduledAt: Date;
      };
    };
