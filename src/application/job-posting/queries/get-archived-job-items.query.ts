import { PrismaService } from "@/infrastructure/database/prisma.service";
import { formatDateLong } from "@/utils/date";

export async function getArchivedJobItems() {
  const prisma = PrismaService.client;

  const jobs = await prisma.jobPosting.findMany({
    where: {
      status: "CLOSED",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      createdAt: true,
      publishedAt: true,
    },
  });

  const formattedJobs = jobs.map((job) => ({
    ...job,
    createdAt: job.createdAt ? formatDateLong(job.createdAt) : "",
    publishedAt: job.publishedAt ? formatDateLong(job.publishedAt) : "",
  }));

  return formattedJobs;
}
