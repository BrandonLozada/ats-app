import "dotenv/config";
import { describe, it, expect } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";

describe("PostgreSQL Pipeline v1 Canonicalization Integration Tests", () => {
  it("verifies AMA Default Hiring pipeline has exactly one PUBLISHED v1 with non-terminal stages", async () => {
    // 1. Fetch AMA tenant and its default pipeline
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "ama" },
      include: {
        pipelines: {
          where: { name: "Default Hiring" },
          include: {
            versions: {
              include: {
                stages: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    expect(tenant).not.toBeNull();
    expect(tenant?.pipelines.length).toBe(1);

    const pipeline = tenant!.pipelines[0];
    expect(pipeline.name).toBe("Default Hiring");
    expect(pipeline.isDefault).toBe(true);

    // 2. Verify PipelineVersion v1 is PUBLISHED with publishedAt populated
    const v1 = pipeline.versions.find((v) => v.version === 1);
    expect(v1).toBeDefined();
    expect(v1!.status).toBe("PUBLISHED");
    expect(v1!.publishedAt).not.toBeNull();
    expect(v1!.tenantId).toBe(tenant!.id);
    expect(v1!.pipelineId).toBe(pipeline.id);

    // 3. Verify stages count and non-terminal semantics
    expect(v1!.stages.length).toBe(4);

    const stageNames = v1!.stages.map((s) => s.name.toLowerCase());
    expect(stageNames).not.toContain("hired");
    expect(stageNames).not.toContain("rejected");
    expect(stageNames).not.toContain("stage_5");
    expect(stageNames).not.toContain("stage_6");

    const categories = v1!.stages.map((s) => s.category);
    expect(categories).toEqual(["APPLIED", "SCREENING", "INTERVIEW", "OFFER"]);

    // 4. Verify exactly one initial stage
    const initialStages = v1!.stages.filter((s) => s.isInitial);
    expect(initialStages.length).toBe(1);
    expect(initialStages[0].category).toBe("APPLIED");
    expect(initialStages[0].order).toBe(1);

    // 5. Verify stage ordering is contiguous and unique
    const orders = v1!.stages.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4]);

    // 6. Verify JobPosting resolution
    const jobPostings = await prisma.jobPosting.findMany({
      where: { pipelineId: pipeline.id },
      include: {
        pipeline: {
          include: {
            versions: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });

    expect(jobPostings.length).toBeGreaterThan(0);
    for (const job of jobPostings) {
      expect(job.pipeline.versions.length).toBe(1);
      expect(job.pipeline.versions[0].version).toBe(1);
      expect(job.pipeline.versions[0].status).toBe("PUBLISHED");
    }
  });

  it("verifies tenant isolation between distinct tenant pipelines and versions", async () => {
    const tenantOtherId = "80000000-0000-4000-c000-000000000001";
    const pipelineOtherId = "80000000-0000-4000-c000-000000000002";
    const versionOtherId = "80000000-0000-4000-c000-000000000003";

    try {
      // Create isolated tenant B pipeline
      await prisma.tenant.upsert({
        where: { id: tenantOtherId },
        update: {},
        create: {
          id: tenantOtherId,
          slug: "tenant-iso-pipe",
          name: "Tenant Iso Pipe",
        },
      });

      await prisma.hiringPipeline.create({
        data: {
          id: pipelineOtherId,
          tenantId: tenantOtherId,
          name: "Default Hiring", // Same name allowed across different tenants
          isDefault: true,
          versions: {
            create: [
              {
                id: versionOtherId,
                version: 1,
                status: "PUBLISHED",
                publishedAt: new Date(),
                stages: {
                  create: [
                    { name: "Applied", category: "APPLIED", order: 1, isInitial: true },
                  ],
                },
              },
            ],
          },
        },
      });

      // Query AMA pipeline versions
      const amaTenant = await prisma.tenant.findUniqueOrThrow({
        where: { slug: "ama" },
        include: {
          pipelines: {
            include: {
              versions: true,
            },
          },
        },
      });

      const amaVersions = amaTenant.pipelines.flatMap((p) => p.versions);
      expect(amaVersions.some((v) => v.tenantId === tenantOtherId)).toBe(false);
      expect(amaVersions.some((v) => v.id === versionOtherId)).toBe(false);

      // Query Tenant Other pipeline versions
      const otherTenant = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenantOtherId },
        include: {
          pipelines: {
            include: {
              versions: true,
            },
          },
        },
      });

      const otherVersions = otherTenant.pipelines.flatMap((p) => p.versions);
      expect(otherVersions.length).toBe(1);
      expect(otherVersions[0].tenantId).toBe(tenantOtherId);
      expect(otherVersions[0].id).toBe(versionOtherId);

    } finally {
      // Cleanup isolated test tenant
      await prisma.pipelineStage.deleteMany({
        where: { pipelineVersionId: versionOtherId },
      });
      await prisma.pipelineVersion.deleteMany({
        where: { id: versionOtherId },
      });
      await prisma.hiringPipeline.deleteMany({
        where: { id: pipelineOtherId },
      });
      await prisma.tenant.deleteMany({
        where: { id: tenantOtherId },
      });
    }
  });
});
