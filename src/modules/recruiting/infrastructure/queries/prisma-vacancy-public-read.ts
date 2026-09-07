import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type { EmploymentType } from "../../application/vacancy/vacancy.types";
import type {
  PublicVacancyDetails,
  PublicVacancySummary,
} from "../../application/vacancy/vacancy-public.types";

export async function findPublishedVacanciesQuery(
  tenantId: string
): Promise<readonly PublicVacancySummary[]> {
  const rows = await prisma.vacancy.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      employmentType: true,
      isRemote: true,
      openings: true,
      publishedAt: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      legalEntity: {
        select: {
          id: true,
          name: true,
        },
      },
      locations: {
        select: {
          openings: true,
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          location: {
            name: "asc",
          },
        },
      },
    },
    orderBy: [
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ],
  });

  return rows.map(
    (raw): PublicVacancySummary => ({
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      description: raw.description,
      employmentType: raw.employmentType as EmploymentType | null,
      isRemote: raw.isRemote,
      openings: raw.openings,
      publishedAt: raw.publishedAt,
      department: {
        id: raw.department.id,
        name: raw.department.name,
      },
      legalEntity: {
        id: raw.legalEntity.id,
        name: raw.legalEntity.name,
      },
      locations: raw.locations.map((loc) => ({
        id: loc.location.id,
        name: loc.location.name,
        openings: loc.openings,
      })),
    })
  );
}

export async function getPublicVacancyDetailsQuery(
  tenantId: string,
  slug: string
): Promise<PublicVacancyDetails | null> {
  const raw = await prisma.vacancy.findFirst({
    where: {
      tenantId,
      slug,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      employmentType: true,
      isRemote: true,
      openings: true,
      publishedAt: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      legalEntity: {
        select: {
          id: true,
          name: true,
        },
      },
      locations: {
        select: {
          openings: true,
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          location: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    employmentType: raw.employmentType as EmploymentType | null,
    isRemote: raw.isRemote,
    openings: raw.openings,
    publishedAt: raw.publishedAt,
    department: {
      id: raw.department.id,
      name: raw.department.name,
    },
    legalEntity: {
      id: raw.legalEntity.id,
      name: raw.legalEntity.name,
    },
    locations: raw.locations.map((loc) => ({
      id: loc.location.id,
      name: loc.location.name,
      openings: loc.openings,
    })),
  };
}
