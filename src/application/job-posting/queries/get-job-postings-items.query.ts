import { PrismaService } from "@/infrastructure/database/prisma.service";

// TODO: Implementar filtros de búsqueda, paginación y ordenamiento en esta consulta para las rutas admin.
export async function getJobPostingsItems() {
  const prisma = PrismaService.client;

  const jobs = await prisma.jobPosting.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      publishedAt: true,
    },
  });

  const formattedJobs = jobs.map((job) => ({
    ...job,
    createdAt: job.createdAt ? job.createdAt.toDateString() : "",
    publishedAt: job.publishedAt ? job.publishedAt.toDateString() : "",
  }));

  return formattedJobs;
}
