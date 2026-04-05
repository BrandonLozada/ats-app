import { ApplicationAggregate } from "@/domain/application/application.aggregate";
import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";

export class ApplicationRepository {
  async findById(id: string) {
    const data = await PrismaService.client.application.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new ApplicationAggregate(
      data.id,
      data.candidateId,
      data.jobPostingId,
      data.stageId,
    );
  }

  async save(app: ApplicationAggregate, userId?: string) {
    const events = app.pullEvents();

    if (events.length === 0) return;

    await PrismaService.client.$transaction(async (tx) => {
      for (const event of events) {
        switch (event.type) {
          case "APPLICATION_CREATED":
            await tx.application.create({
              data: {
                id: event.payload.applicationId,
                candidateId: event.payload.candidateId,
                jobPostingId: event.payload.jobPostingId,
              },
            });

            await AuditService.log({
              entity: "Application",
              entityId: event.payload.applicationId,
              action: "CREATED",
              userId,
            });
            break;

          case "STAGE_MOVED":
            await tx.application.update({
              where: { id: event.payload.applicationId },
              data: {
                stageId: event.payload.toStageId,
              },
            });

            await tx.applicationStageHistory.create({
              data: {
                applicationId: event.payload.applicationId,
                fromStageId: event.payload.fromStageId,
                toStageId: event.payload.toStageId,
                movedById: event.payload.movedById,
              },
            });

            await AuditService.log({
              entity: "Application",
              entityId: event.payload.applicationId,
              action: "STAGE_MOVED",
              userId,
              metadata: event.payload,
            });

            break;

          case "INTERVIEW_SCHEDULED":
            await tx.interview.create({
              data: {
                applicationId: event.payload.applicationId,
                scheduledAt: event.payload.scheduledAt,
                stageId: event.payload.stageId,
                type: "ONLINE",
                status: "SCHEDULED",
              },
            });

            await AuditService.log({
              entity: "Application",
              entityId: event.payload.applicationId,
              action: "INTERVIEW_SCHEDULED",
              userId,
              metadata: event.payload,
            });

            break;
        }
      }
    });
  }

  async exists(candidateId: string, jobPostingId: string) {
    const count = await PrismaService.client.application.count({
      where: { candidateId, jobPostingId },
    });

    return count > 0;
  }

  create(props: { candidateId: string; jobPostingId: string }) {
    return ApplicationAggregate.create({
      id: crypto.randomUUID(),
      ...props,
    });
  }
}
