"use server";

import { EmploymentType } from "@/generated/prisma/enums";
import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getPublishedJobs() {
  // TODO: Al publicar una vacante, esperaría que tuviera hora de publicación y no la propiedad nula.
  const jobs = await PrismaService.client.jobPosting.findMany({
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

  console.log("formattedJobs: ", formattedJobs);

  return formattedJobs;
}

// With more complex data
export async function getPublishedJobsOld() {
  return PrismaService.client.jobPosting.findMany({
    where: {
      status: "PUBLISHED",
      noIndex: false,
    },
    include: {
      category: true,
      department: true,
    },
  });
}

export async function getPublishedJobBySlug(slug: string) {
  const job = await PrismaService.client.jobPosting.findUniqueOrThrow({
    where: {
      slug: slug,
      status: "PUBLISHED",
      noIndex: false,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      salaryCurrency: true,
      salaryMin: true,
      salaryMax: true,
      organization: {
        select: {
          id: true,
          name: true,
          website: true,
          logoUrl: true,
        },
      },
      createdAt: true,
      publishedAt: true,
    },
  });

  const formattedJob = {
    ...job,
    // TODO: Asignar moneda del salario cuando se crea una vacante.
    salaryCurrency: job.salaryCurrency ?? "MXN",
    salaryMin: Number(job.salaryMin),
    salaryMax: Number(job.salaryMax),
    organization: {
      ...job.organization,
      website: job.organization?.website ?? "",
      logoUrl: job.organization?.logoUrl ?? "",
    },
    createdAt: job.createdAt ? job.createdAt.toDateString() : "",
    publishedAt: job.publishedAt ? job.publishedAt.toDateString() : "",
  };

  console.log(formattedJob);

  return formattedJob;
}

export async function getPublicJobs({
  search,
  organizationId,
  employmentType,
}: {
  search?: string;
  organizationId?: string;
  employmentType?: string;
}) {
  return PrismaService.client.jobPosting.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [{ validThrough: null }, { validThrough: { gte: new Date() } }],

      ...(search && {
        title: {
          contains: search,
          mode: "insensitive",
        },
      }),

      ...(organizationId && { organizationId }),

      ...(employmentType && {
        employmentType: employmentType as never,
      }),
    },

    orderBy: {
      publishedAt: "desc",
    },

    take: 30,

    select: {
      id: true,
      title: true,
      employmentType: true,
      isRemote: true,
      publishedAt: true,
      organization: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
  });
}

export async function getJobDetail(jobId: string, userId?: string) {
  let tenantId: string | null = null;
  if (userId) {
    const jobMeta = await PrismaService.client.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        department: { select: { tenantId: true } },
        pipeline: { select: { tenantId: true } },
      },
    });
    tenantId = jobMeta?.department?.tenantId ?? jobMeta?.pipeline?.tenantId ?? null;
    if (!tenantId) {
      throw new Error("Transitional getJobDetail: Unable to deterministically resolve tenantId for job posting.");
    }
  }

  return PrismaService.client.jobPosting.findUnique({
    where: { id: jobId },

    include: {
      organization: true,
      category: true,
      department: true,
      _count: {
        select: {
          applications: true,
        },
      },
      applications: (userId && tenantId)
        ? {
            where: {
              candidate: {
                tenantId,
                authUserId: userId,
              },
            },
            select: { id: true },
          }
        : false,
    },
  });
}

export async function getJobs(params: {
  search?: string;
  // employmentType?: EmploymentType;
  employmentType?: string;
  organizationId?: string;
}) {
  const now = new Date();

  const jobs = await PrismaService.client.jobPosting.findMany({
    where: {
      status: "PUBLISHED",

      publishedAt: { lte: now },

      OR: [{ validThrough: null }, { validThrough: { gte: now } }],

      ...(params.search && {
        title: {
          contains: params.search,
          mode: "insensitive",
        },
      }),

      ...(params.employmentType && {
        employmentType: params.employmentType as EmploymentType,
      }),

      ...(params.organizationId && {
        organizationId: params.organizationId,
      }),
    },

    orderBy: {
      publishedAt: "desc",
    },

    take: 30,

    select: {
      id: true,
      title: true,
      employmentType: true,
      isRemote: true,
      publishedAt: true,

      organization: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    employmentType: job.employmentType,

    organizationName: job.organization?.name ?? null,
    organizationLogo: job.organization?.logoUrl ?? null,

    location: job.isRemote ? "Remote" : "N/A",

    publishedAt: job.publishedAt,
  }));
}

export async function getJobById({
  jobId,
  userId,
}: {
  jobId: string;
  userId?: string;
}) {
  let tenantId: string | null = null;
  if (userId) {
    const jobMeta = await PrismaService.client.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        department: { select: { tenantId: true } },
        pipeline: { select: { tenantId: true } },
      },
    });
    tenantId = jobMeta?.department?.tenantId ?? jobMeta?.pipeline?.tenantId ?? null;
    if (!tenantId) {
      throw new Error("Transitional getJobById: Unable to deterministically resolve tenantId for job posting.");
    }
  }

  const job = await PrismaService.client.jobPosting.findUnique({
    where: { id: jobId },

    include: {
      organization: true,
      category: true,
      department: true,

      _count: {
        select: {
          applications: true,
        },
      },

      applications: (userId && tenantId)
        ? {
            where: {
              candidate: {
                tenantId,
                authUserId: userId,
              },
            },
            select: { id: true },
          }
        : false,
    },
  });

  if (!job) return null;

  // return {
  //   id: job.id,
  //   title: job.title,
  //   slug: job.slug,
  //   description: job.description,
  //   responsibilities: job.responsibilities,
  //   requirements: job.requirements,
  //   benefits: job.benefits,

  //   salaryCurrency: job.salaryCurrency ?? "MXN",
  //   salaryMin: Number(job.salaryMin),
  //   salaryMax: Number(job.salaryMax),

  //   employmentType: job.employmentType,
  //   seniorityLevel: job.seniorityLevel,

  //   organizationName: job.organization ? job.organization.name : null,

  //   organization: job.organization
  //     ? {
  //         name: job.organization.name,
  //         logo: job.organization.logoUrl,
  //       }
  //     : null,

  //   department: job.department?.name ?? null,
  //   category: job.category?.name ?? null,

  //   isRemote: job.isRemote,

  //   salary:
  //     job.salaryMin && job.salaryMax
  //       ? `${job.salaryMin} - ${job.salaryMax} ${job.salaryCurrency ?? ""}`
  //       : null,

  //   publishedAt: job.publishedAt,
  //   validThrough: job.validThrough,

  //   totalApplications: job._count.applications,

  //   alreadyApplied: userId ? job.applications.length > 0 : false,
  //   alreadySaved: userId ? job.applications.length > 0 : false,
  // };

  return {
    id: job.id,
    title: job.title,
    slug: job.slug,
    description: job.description,

    salaryCurrency: job.salaryCurrency ?? "MXN",
    salaryMin: Number(job.salaryMin),
    salaryMax: Number(job.salaryMax),

    organization: job.organization
      ? {
          id: job.organization.id,
          name: job.organization.name,
          website: job.organization.website ?? null,
          logoUrl: job.organization.logoUrl ?? null,
        }
      : null,

    createdAt: job.createdAt.toISOString(),
    publishedAt: job.publishedAt?.toISOString() ?? null,

    alreadyApplied: userId ? job.applications.length > 0 : false,
    alreadySaved: false, // 👈 hasta que tengas tabla real
  };
}
