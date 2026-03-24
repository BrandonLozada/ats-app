import { PrismaService } from "@/lib/prisma/prisma.service";
import { Prisma } from "@/src/generated/prisma/client";

export const candidateRepository = {
  findByEmail(email: string) {
    return PrismaService.client.candidate.findUnique({
      where: { email },
    });
  },

  findByPhone(phone: string) {
    return PrismaService.client.candidate.findFirst({
      where: { phone },
    });
  },

  // En el repositorio del módulo lo conveniente no es enlazar zod si no validar el tipo desde Prisma que es nuestra infra.
  create(data: Prisma.CandidateUncheckedCreateInput) {
    return PrismaService.client.candidate.create({
      data,
    });
  },
};
