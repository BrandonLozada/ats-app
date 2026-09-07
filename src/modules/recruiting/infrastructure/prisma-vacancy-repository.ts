import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import {
  EmploymentType,
  VacancyLocationRecord,
  VacancyRecord,
  VacancyStatus,
} from "../application/vacancy/vacancy.types";
import {
  CreateVacancyData,
  PipelineVersionStatus,
  VacancyRepositoryPort,
  VacancySlugAlreadyExistsException,
} from "../application/vacancy/ports/vacancy-repository";

type PrismaVacancyWithLocations = {
  id: string;
  tenantId: string;
  departmentId: string;
  legalEntityId: string;
  pipelineVersionId: string;
  title: string;
  slug: string;
  description: string | null;
  employmentType: string | null;
  isRemote: boolean;
  openings: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  locations: {
    id: string;
    locationId: string;
    openings: number;
    createdAt: Date;
  }[];
};

function mapToVacancyRecord(raw: PrismaVacancyWithLocations): VacancyRecord {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    departmentId: raw.departmentId,
    legalEntityId: raw.legalEntityId,
    pipelineVersionId: raw.pipelineVersionId,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    employmentType: raw.employmentType as EmploymentType | null,
    isRemote: raw.isRemote,
    openings: raw.openings,
    status: raw.status as VacancyStatus,
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    locations: (raw.locations ?? []).map((loc): VacancyLocationRecord => ({
      id: loc.id,
      locationId: loc.locationId,
      openings: loc.openings,
      createdAt: loc.createdAt,
    })),
  };
}

export class PrismaVacancyRepository implements VacancyRepositoryPort {
  async findVacancyById(
    tenantId: string,
    id: string
  ): Promise<VacancyRecord | null> {
    const vacancy = await prisma.vacancy.findUnique({
      where: {
        tenantId_id: { tenantId, id },
      },
      include: {
        locations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return vacancy ? mapToVacancyRecord(vacancy) : null;
  }

  async findVacancyBySlug(
    tenantId: string,
    slug: string
  ): Promise<VacancyRecord | null> {
    const vacancy = await prisma.vacancy.findUnique({
      where: {
        tenantId_slug: { tenantId, slug },
      },
      include: {
        locations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return vacancy ? mapToVacancyRecord(vacancy) : null;
  }

  async checkDepartmentExistsInTenant(
    tenantId: string,
    departmentId: string
  ): Promise<boolean> {
    const count = await prisma.department.count({
      where: {
        tenantId,
        id: departmentId,
      },
    });
    return count > 0;
  }

  async checkLegalEntityExistsInTenant(
    tenantId: string,
    legalEntityId: string
  ): Promise<boolean> {
    const count = await prisma.legalEntity.count({
      where: {
        tenantId,
        id: legalEntityId,
      },
    });
    return count > 0;
  }

  async checkLocationBelongsToLegalEntityAndTenant(
    tenantId: string,
    legalEntityId: string,
    locationId: string
  ): Promise<boolean> {
    const count = await prisma.location.count({
      where: {
        tenantId,
        legalEntityId,
        id: locationId,
      },
    });
    return count > 0;
  }

  async findPipelineVersion(
    tenantId: string,
    pipelineVersionId: string
  ): Promise<{ id: string; status: PipelineVersionStatus } | null> {
    const pv = await prisma.pipelineVersion.findUnique({
      where: {
        tenantId_id: { tenantId, id: pipelineVersionId },
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!pv) {
      return null;
    }
    return {
      id: pv.id,
      status: pv.status as PipelineVersionStatus,
    };
  }

  async createVacancyWithLocations(
    data: CreateVacancyData
  ): Promise<VacancyRecord> {
    try {
      return await prisma.$transaction(async (tx) => {
        const vacancy = await tx.vacancy.create({
          data: {
            tenantId: data.tenantId,
            departmentId: data.departmentId,
            legalEntityId: data.legalEntityId,
            pipelineVersionId: data.pipelineVersionId,
            title: data.title,
            slug: data.slug,
            description: data.description ?? null,
            employmentType: data.employmentType ?? null,
            isRemote: data.isRemote ?? false,
            openings: data.openings,
            status: "DRAFT",
            publishedAt: null,
          },
        });

        await tx.vacancyLocation.createMany({
          data: data.locations.map((loc) => ({
            tenantId: data.tenantId,
            vacancyId: vacancy.id,
            legalEntityId: data.legalEntityId,
            locationId: loc.locationId,
            openings: loc.openings,
          })),
        });

        const fullVacancy = await tx.vacancy.findUniqueOrThrow({
          where: { id: vacancy.id },
          include: {
            locations: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        return mapToVacancyRecord(fullVacancy);
      });
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
        throw new VacancySlugAlreadyExistsException(
          `Vacancy with slug "${data.slug}" already exists in this tenant.`
        );
      }
      throw e;
    }
  }

  async publishVacancy(
    tenantId: string,
    vacancyId: string,
    publishedAt: Date
  ): Promise<VacancyRecord | null> {
    // Conditional atomic transition: UPDATE ... WHERE tenant_id = $1 AND id = $2 AND status = 'DRAFT'
    const updateResult = await prisma.vacancy.updateMany({
      where: {
        tenantId,
        id: vacancyId,
        status: "DRAFT",
      },
      data: {
        status: "PUBLISHED",
        publishedAt,
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    const updated = await prisma.vacancy.findUnique({
      where: {
        tenantId_id: { tenantId, id: vacancyId },
      },
      include: {
        locations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return updated ? mapToVacancyRecord(updated) : null;
  }
}
