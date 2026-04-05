import { PrismaService } from "@/infrastructure/database/prisma.service";

export const ApplicationRepository = {
  findExisting: (candidateId: string, jobPostingId: string) =>
    PrismaService.client.application.findUnique({
      where: {
        candidateId_jobPostingId: {
          candidateId,
          jobPostingId,
        },
      },
    }),

  create: (data: any) =>
    PrismaService.client.application.create({
      data,
    }),
};