import { PrismaService } from "@/infrastructure/database/prisma.service";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { createAppContext } from "@/infrastructure/auth/create-context";
import { requirePermission } from "@/application/auth/guards";
import { removeUndefined } from "@/application/shared/utils/remove-undefined";
import { diffFields } from "@/application/shared/utils/diff-fields";
import { UpdateJobInput } from "../dto/update-job.input";

export async function updateJobUseCase(input: UpdateJobInput) {
  const ctx = await createAppContext();

  requirePermission(ctx, "job.update");

  const prisma = PrismaService.client;

  const { jobId, ...updateData } = input;

  // TODO: Borrar mensaje de consola.
  console.log("\nupdateData: ", updateData);

  // Buscar job existente
  const existing = await prisma.jobPosting.findUnique({
    where: { id: jobId },
  });

  if (!existing) {
    throw new Error("Job not found");
  }

  // Validaciones de negocio
  const min = updateData.salaryMin;
  const max = updateData.salaryMax;

  // Solo uno definido
  if ((min != null && max == null) || (min == null && max != null)) {
    throw new Error("Salary must include both min and max or neither");
  }

  // Ambos pero inválidos
  if (min != null && max != null && min > max) {
    throw new Error("salaryMin cannot be greater than salaryMax");
  }

  if (updateData.validThrough && updateData.publishedAt) {
    if (updateData.validThrough < updateData.publishedAt) {
      throw new Error("validThrough cannot be before publishedAt");
    }
  }

  // Evitar modificar campos prohibidos (ejemplo)
  const forbiddenFields = ["id", "createdById", "createdAt"];

  for (const field of forbiddenFields) {
    if (field in updateData) {
      throw new Error(`Field ${field} cannot be updated`);
    }
  }

  // Limpiar undefined
  const data = removeUndefined(updateData);

  // Detectar cambios
  const changes = diffFields(existing, data);

  // Si no hay cambios → No hace nada
  if (Object.keys(changes).length === 0) {
    return existing;
  }

  // Actualizar
  const updated = await prisma.jobPosting.update({
    where: { id: jobId },
    data: {
      ...data,
      updatedById: ctx.userId,
    },
  });

  // Auditoría
  await AuditService.log({
    entity: "JobPosting",
    entityId: updated.id,
    action: "UPDATE",
    userId: ctx.userId,
    metadata: {
      changes,
    },
  });

  return updated;
}
