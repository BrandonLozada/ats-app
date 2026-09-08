import { PrismaService } from "@/infrastructure/database/prisma.service";

export const candidateService = {
  async getByUserId(tenantId: string, userId: string) {
    if (!tenantId || tenantId.trim() === "") {
      throw new Error("Transitional candidateService.getByUserId: tenantId is required and cannot be empty.");
    }
    if (!userId || userId.trim() === "") {
      throw new Error("Transitional candidateService.getByUserId: userId is required and cannot be empty.");
    }

    return PrismaService.client.candidate.findUnique({
      where: {
        tenantId_authUserId: {
          tenantId,
          authUserId: userId,
        },
      },
    });
  },
};
