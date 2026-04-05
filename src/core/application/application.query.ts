import { PrismaService } from "@/infrastructure/database/prisma.service";

export const ApplicationQuery = {
  async getFunnel(jobPostingId: string) {
    const data = await PrismaService.client.application.groupBy({
      by: ["stageId"],
      where: { jobPostingId },
      _count: true,
    });

    return data;
  },

  async getPipelineByJob(jobPostingId: string) {
    const applications = await PrismaService.client.application.findMany({
      where: { jobPostingId },
      include: {
        stage: true,
        candidate: true,
      },
    });

    // Agrupar por stage
    const grouped = applications.reduce((acc: any, app) => {
      const stageName = app.stage?.name || "UNKNOWN";

      if (!acc[stageName]) {
        acc[stageName] = [];
      }

      acc[stageName].push(app);

      return acc;
    }, {});

    return grouped;
  },

  async getStageDurations(jobPostingId: string) {
    const histories =
      await PrismaService.client.applicationStageHistory.findMany({
        where: {
          application: {
            jobPostingId,
          },
        },
        orderBy: {
          movedAt: "asc",
        },
        include: {
          application: true,
        },
      });

    const durations: any = {};

    for (let i = 1; i < histories.length; i++) {
      const prev = histories[i - 1];
      const curr = histories[i];

      if (prev.applicationId !== curr.applicationId) continue;

      const stage = prev.toStageId;

      const diff =
        new Date(curr.movedAt).getTime() - new Date(prev.movedAt).getTime();

      if (!durations[stage]) {
        durations[stage] = [];
      }

      durations[stage].push(diff);
    }

    // Promedio
    const averages = Object.entries(durations).map(([stage, times]: any) => ({
      stage,
      avgTimeMs:
        times.reduce((a: number, b: number) => a + b, 0) / times.length,
    }));

    return averages;
  },
};
