import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getJobPreviewById(jobId: string) {
  const prisma = PrismaService.client;

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      category: {
        select: { name: true },
      },
      department: {
        select: { name: true },
      },
      pipeline: {
        select: {
          name: true,
        },
      },
      branches: {
        include: {
          branch: true,
        },
      },
    },
  });

  if (!job) return null;

  const formattedJob = {
    id: job.id,
    title: job.title,
    slug: job.slug,
    description: job.description,

    responsibilities: job.responsibilities,
    requirements: job.requirements,
    benefits: job.benefits,

    employmentType: job.employmentType,
    seniorityLevel: job.seniorityLevel,

    // categoryId: job.categoryId,
    // departmentId: job.departmentId,
    // pipelineId: job.pipelineId,

    category: job.category.name,
    department: job.department?.name ?? null,
    pipeline: job.pipeline.name,

    salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
    salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
    salaryCurrency: job.salaryCurrency,

    isRemote: job.isRemote,
    applyUrl: job.applyUrl,

    metaTitle: job.metaTitle,
    metaDescription: job.metaDescription,
    noIndex: job.noIndex,

    publishedAt: job.publishedAt,
    validThrough: job.validThrough,

    organizationId: job.organizationId,

    branches: job.branches.map((b) => ({
      branchId: b.branchId,
      name: b.branch.name,
    })),
  };

  return formattedJob;
}
