import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import {
  HiringPipelineRecord,
  PipelineStageRecord,
  PipelineVersionRecord,
  PipelineVersionStatus,
  StageCategory,
  StageInput,
} from "../application/pipeline/pipeline.types";
import {
  CreateDraftVersionData,
  CreatePipelineData,
  PipelineDraftAlreadyExistsException,
  PipelineNameAlreadyExistsException,
  PipelineRepositoryPort,
} from "../application/pipeline/ports/pipeline-repository";

type PrismaVersionWithStages = {
  id: string;
  tenantId: string;
  pipelineId: string;
  version: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stages: {
    id: string;
    name: string;
    category: string;
    order: number;
    isInitial: boolean;
  }[];
};

function mapToVersionRecord(raw: PrismaVersionWithStages): PipelineVersionRecord {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    pipelineId: raw.pipelineId,
    version: raw.version,
    status: raw.status as PipelineVersionStatus,
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    stages: (raw.stages ?? []).map((s): PipelineStageRecord => ({
      id: s.id,
      name: s.name,
      category: s.category as StageCategory,
      order: s.order,
      isInitial: s.isInitial,
    })),
  };
}

export class PrismaPipelineRepository implements PipelineRepositoryPort {
  async findPipelineById(
    tenantId: string,
    pipelineId: string
  ): Promise<HiringPipelineRecord | null> {
    if (!tenantId || !pipelineId) return null;

    const pipeline = await prisma.hiringPipeline.findFirst({
      where: {
        id: pipelineId,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!pipeline) return null;

    return {
      id: pipeline.id,
      tenantId: pipeline.tenantId,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }

  async findPipelineByName(
    tenantId: string,
    name: string
  ): Promise<HiringPipelineRecord | null> {
    if (!tenantId || !name) return null;

    const pipeline = await prisma.hiringPipeline.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name,
        },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!pipeline) return null;

    return {
      id: pipeline.id,
      tenantId: pipeline.tenantId,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }

  async findVersionById(
    tenantId: string,
    versionId: string
  ): Promise<PipelineVersionRecord | null> {
    if (!tenantId || !versionId) return null;

    const version = await prisma.pipelineVersion.findFirst({
      where: {
        id: versionId,
        tenantId,
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!version) return null;

    return mapToVersionRecord(version);
  }

  async findVersionsByPipelineId(
    tenantId: string,
    pipelineId: string
  ): Promise<readonly PipelineVersionRecord[]> {
    if (!tenantId || !pipelineId) return [];

    const versions = await prisma.pipelineVersion.findMany({
      where: {
        pipelineId,
        tenantId,
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { version: "asc" },
    });

    return versions.map(mapToVersionRecord);
  }

  async createPipelineWithDraftVersion(
    data: CreatePipelineData
  ): Promise<PipelineVersionRecord> {
    try {
      return await prisma.$transaction(async (tx) => {
        const pipeline = await tx.hiringPipeline.create({
          data: {
            tenantId: data.tenantId,
            name: data.name,
            isDefault: data.isDefault ?? false,
          },
        });

        const version = await tx.pipelineVersion.create({
          data: {
            tenantId: data.tenantId,
            pipelineId: pipeline.id,
            version: 1,
            status: "DRAFT",
            stages: {
              create: data.stages.map((s) => ({
                name: s.name,
                category: s.category,
                order: s.order,
                isInitial: s.isInitial,
              })),
            },
          },
          include: {
            stages: {
              orderBy: { order: "asc" },
            },
          },
        });

        return mapToVersionRecord(version);
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "P2002"
      ) {
        throw new PipelineNameAlreadyExistsException(
          `Pipeline with name "${data.name}" already exists in tenant.`
        );
      }
      throw error;
    }
  }

  async createDraftVersion(
    data: CreateDraftVersionData
  ): Promise<PipelineVersionRecord> {
    try {
      const version = await prisma.pipelineVersion.create({
        data: {
          tenantId: data.tenantId,
          pipelineId: data.pipelineId,
          version: data.version,
          status: "DRAFT",
          stages: {
            create: data.stages.map((s) => ({
              name: s.name,
              category: s.category,
              order: s.order,
              isInitial: s.isInitial,
            })),
          },
        },
        include: {
          stages: {
            orderBy: { order: "asc" },
          },
        },
      });

      return mapToVersionRecord(version);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "P2002"
      ) {
        throw new PipelineDraftAlreadyExistsException(
          `Pipeline version ${data.version} already exists for this pipeline.`
        );
      }
      throw error;
    }
  }

  async replaceDraftStages(
    tenantId: string,
    versionId: string,
    stages: readonly StageInput[]
  ): Promise<PipelineVersionRecord | null> {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify version exists, belongs to tenant, and is in DRAFT status
      const existing = await tx.pipelineVersion.findFirst({
        where: {
          id: versionId,
          tenantId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing || existing.status !== "DRAFT") {
        return null;
      }

      // 2. Delete existing stages
      await tx.pipelineStage.deleteMany({
        where: {
          pipelineVersionId: versionId,
        },
      });

      // 3. Insert new stages
      await tx.pipelineStage.createMany({
        data: stages.map((s) => ({
          pipelineVersionId: versionId,
          name: s.name,
          category: s.category,
          order: s.order,
          isInitial: s.isInitial,
        })),
      });

      // 4. Return refreshed version with new stages
      const updated = await tx.pipelineVersion.findUnique({
        where: { id: versionId },
        include: {
          stages: {
            orderBy: { order: "asc" },
          },
        },
      });

      return updated ? mapToVersionRecord(updated) : null;
    });
  }

  async publishVersion(
    tenantId: string,
    versionId: string,
    publishedAt: Date
  ): Promise<PipelineVersionRecord | null> {
    // Atomic update guarded by tenantId and DRAFT status
    const updateResult = await prisma.pipelineVersion.updateMany({
      where: {
        id: versionId,
        tenantId,
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

    const published = await prisma.pipelineVersion.findUnique({
      where: { id: versionId },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    return published ? mapToVersionRecord(published) : null;
  }

  async findLatestPublishedVersion(
    tenantId: string,
    pipelineId: string
  ): Promise<PipelineVersionRecord | null> {
    if (!tenantId || !pipelineId) return null;

    const version = await prisma.pipelineVersion.findFirst({
      where: {
        pipelineId,
        tenantId,
        status: "PUBLISHED",
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        version: "desc",
      },
    });

    if (!version) return null;

    return mapToVersionRecord(version);
  }
}
