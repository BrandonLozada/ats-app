import { PrismaService } from "@/infrastructure/database/prisma.service";

export const candidateService = {
  async getByUserId(userId: string) {
    return PrismaService.client.candidate.findUnique({
      where: { userId },
    });
  },
};
