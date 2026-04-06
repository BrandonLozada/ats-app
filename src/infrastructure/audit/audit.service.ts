import { PrismaService } from "@/infrastructure/database/prisma.service";

type AuditAction =
  | "CREATE"
  | "CREATED"
  | "UPDATE"
  | "DELETE"
  | "MOVE_STAGE"
  | "STAGE_MOVED"
  | "INTERVIEW_SCHEDULED"
  | "APPLY"
  | "LOGIN"
  | "OTHER"
  | "PUBLISH";

interface AuditLogParams {
  entity: string;
  entityId: string;
  action: AuditAction;
  userId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export const AuditService = {
  async log(params: AuditLogParams) {
    const prisma = PrismaService.client;

    try {
      await prisma.auditLog.create({
        data: {
          entity: params.entity,
          entityId: params.entityId,
          action: params.action,
          userId: params.userId ?? null,
          metadata: params.metadata ?? {},
        },
      });
    } catch (error) {
      console.error("[AuditLogError]", error);
    }
  },
};
