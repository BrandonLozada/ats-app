import { ApplicationEvent } from "./application.events";

export class ApplicationAggregate {
  private events: ApplicationEvent[] = [];

  constructor(
    public id: string,
    public candidateId: string,
    public jobPostingId: string,
    public stageId: string | null,
  ) {}

  static create(props: {
    id: string;
    candidateId: string;
    jobPostingId: string;
  }) {
    const app = new ApplicationAggregate(
      props.id,
      props.candidateId,
      props.jobPostingId,
      null,
    );

    app.events.push({
      type: "APPLICATION_CREATED",
      payload: {
        applicationId: app.id,
        candidateId: props.candidateId,
        jobPostingId: props.jobPostingId,
      },
    });

    return app;
  }

  moveToStage(newStageId: string, userId?: string) {
    if (this.stageId === newStageId) {
      throw new Error("Already in this stage");
    }

    this.events.push({
      type: "STAGE_MOVED",
      payload: {
        applicationId: this.id,
        fromStageId: this.stageId,
        toStageId: newStageId,
        movedById: userId,
      },
    });

    this.stageId = newStageId;
  }

  scheduleInterview(date: Date, stageId?: string) {
    this.events.push({
      type: "INTERVIEW_SCHEDULED",
      payload: {
        applicationId: this.id,
        scheduledAt: date,
        stageId,
      },
    });
  }

  pullEvents(): ApplicationEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}
