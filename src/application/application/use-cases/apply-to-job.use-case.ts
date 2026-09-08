import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { applyToJobSchema } from "../schemas/apply-to-job.schema";
import { normalizeEmail } from "@/shared/utils/normalize-email";

export async function applyToJobUseCase(input: unknown) {
  const prisma = PrismaService.client;

  // 1. Validate input
  const data = applyToJobSchema.parse(input);

  // 2. Load required legacy JobPosting context
  const job = await prisma.jobPosting.findUnique({
    where: { id: data.jobPostingId },
    include: {
      department: { select: { tenantId: true } },
      pipeline: {
        include: {
          versions: {
            include: {
              stages: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // 3. Deterministically resolve its Tenant
  const tenantId = job.department?.tenantId ?? job.pipeline?.tenantId;
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("Transitional applyToJobUseCase: Unable to deterministically resolve tenantId for job posting.");
  }

  // Context (session optional, scoped to tenant)
  let ctx: Awaited<ReturnType<typeof createAppContext>> | null = null;
  try {
    ctx = await createAppContext(tenantId);
  } catch {
    ctx = null;
  }

  // 4. Normalize email
  if (!data.email || data.email.trim() === "") {
    throw new Error("Transitional applyToJobUseCase: Candidate email is required.");
  }
  const normalizedEmail = normalizeEmail(data.email);
  if (!normalizedEmail || normalizedEmail.trim() === "") {
    throw new Error("Transitional applyToJobUseCase: Valid email is required.");
  }

  // 5. Candidate lookup by tenantId + emailNormalized
  let candidate = await prisma.candidate.findFirst({
    where: {
      tenantId,
      emailNormalized: normalizedEmail,
      deletedAt: null,
    },
  });

  // 6. Candidate create with that exact tenantId
  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        tenantId,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        phone: data.phone,
        cvUrl: data.cvUrl,
        sourceId: data.sourceId,
        authUserId: ctx?.userId ?? null,
      },
    });
  }

  // 7. Optional authUserId linking only within that Candidate/Tenant
  if (ctx?.userId && !candidate.authUserId) {
    const existingClaim = await prisma.candidate.findUnique({
      where: {
        tenantId_authUserId: {
          tenantId,
          authUserId: ctx.userId,
        },
      },
    });
    if (!existingClaim) {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          authUserId: ctx.userId,
        },
      });
    }
  }

  // 6. Obtener stage inicial
  // Transitional compatibility: verify exactly one usable PipelineVersion exists or fail explicitly if ambiguous.
  // TODO [I6-S3-T03]: Replace transitional resolution with canonical Recruiting module version resolver.
  const versions = job.pipeline?.versions ?? [];
  if (versions.length === 0) {
    throw new Error("Pipeline has no versions");
  }
  if (versions.length > 1) {
    throw new Error("Ambiguous pipeline version: multiple versions exist for legacy job posting");
  }

  const stages = versions[0].stages;
  const initialStage =
    stages.find((s) => s.isInitial) ??
    stages.find((s) => s.category === "APPLIED") ??
    stages.slice().sort((a, b) => a.order - b.order)[0];

  if (!initialStage) {
    throw new Error("Pipeline has no initial stage");
  }

  // TODO: Podríamos hacer todo esto en una transacción para optimizar, pero por simplicidad lo dejamos así por ahora.
  // 7. Crear application
  const application = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobPostingId: job.id,
      stageId: initialStage.id,
      sourceId: data.sourceId,
      notes: data.notes,
      createdById: ctx?.userId ?? null,
    },
  });

  // 8. Crear historial inicial
  await prisma.applicationStageHistory.create({
    data: {
      applicationId: application.id,
      toStageId: initialStage.id,
      movedById: ctx?.userId ?? null,
      notes: "Initial application",
    },
  });

  // 9. Audit log
  await AuditService.log({
    entity: "Application",
    entityId: application.id,
    action: "CREATE",
    userId: ctx?.userId ?? null,
    metadata: {
      jobPostingId: job.id,
      candidateId: candidate.id,
    },
  });

  return application;
}
