import { PrismaService } from "@/infrastructure/database/prisma.service";
import { Prisma } from "@/generated/prisma/client";

export const CandidateRepository = {
  // En el repositorio del módulo lo conveniente no es enlazar zod si no validar el tipo desde Prisma que es nuestra infra.
  create: (data: Prisma.CandidateUncheckedCreateInput) =>
    PrismaService.client.candidate.create({ data }),

  update: (id: string, data: Prisma.CandidateUncheckedUpdateInput) =>
    PrismaService.client.candidate.update({
      where: { id },
      data,
    }),

  findByEmail: async (tenantId: string, emailNormalized: string) => {
    if (!tenantId || tenantId.trim() === "") {
      throw new Error("Transitional CandidateRepository.findByEmail: tenantId is required.");
    }
    return PrismaService.client.candidate.findFirst({
      where: {
        tenantId,
        emailNormalized,
        deletedAt: null,
      },
    });
  },

  findByPhone(phone: string) {
    return PrismaService.client.candidate.findFirst({
      where: { phone },
    });
  },

  findById: (id: string) =>
    PrismaService.client.candidate.findUnique({
      where: { id },
    }),
};
