import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  createPipeline,
  createPipelineVersion,
  updateDraftPipelineVersion,
  publishPipelineVersion,
  resolvePipelineVersion,
} from "@/modules/recruiting/public.server";
import type { AuthenticatedContext } from "@/modules/organization/public";
import { StageInput } from "@/modules/recruiting/public";

describe("Recruiting Pipeline Capability Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "90000000-0000-4000-d000-000000000001";
  const tenantBId = "90000000-0000-4000-d000-000000000002";

  const authA: AuthenticatedContext = {
    actor: {
      userId: "usr_alpha_pipe",
      email: "recruiter_a@tenant-alpha.com",
      name: "Recruiter Alpha",
    },
    tenant: {
      tenantId: tenantAId,
      slug: "tenant-alpha-pipe",
      name: "Tenant Alpha Pipe",
    },
    membership: {
      membershipId: "mem_alpha_pipe",
    },
    roles: ["RECRUITER"],
    permissions: ["pipeline.manage"],
  };

  const authB: AuthenticatedContext = {
    actor: {
      userId: "usr_beta_pipe",
      email: "recruiter_b@tenant-beta.com",
      name: "Recruiter Beta",
    },
    tenant: {
      tenantId: tenantBId,
      slug: "tenant-beta-pipe",
      name: "Tenant Beta Pipe",
    },
    membership: {
      membershipId: "mem_beta_pipe",
    },
    roles: ["RECRUITER"],
    permissions: ["pipeline.manage"],
  };

  const baseStages: StageInput[] = [
    { name: "Postulación", category: "APPLIED", order: 1, isInitial: true },
    { name: "Filtro", category: "SCREENING", order: 2, isInitial: false },
    { name: "Oferta", category: "OFFER", order: 3, isInitial: false },
  ];

  async function cleanupTestData() {
    // Delete test pipelines and versions for tenantA and tenantB
    await prisma.hiringPipeline.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    // Create test tenants
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantAId,
          slug: "tenant-alpha-pipe",
          name: "Tenant Alpha Pipe",
        },
        {
          id: tenantBId,
          slug: "tenant-beta-pipe",
          name: "Tenant Beta Pipe",
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("allows same pipeline name across tenants but rejects duplicates in same tenant", async () => {
    const pipelineName = "Pipeline Compartido";

    // 1. Tenant A creates pipeline
    const resA = await createPipeline(authA, {
      name: pipelineName,
      stages: baseStages,
    });
    expect(resA.ok).toBe(true);

    // 2. Tenant B creates pipeline with same name -> allowed
    const resB = await createPipeline(authB, {
      name: pipelineName,
      stages: baseStages,
    });
    expect(resB.ok).toBe(true);

    // 3. Tenant A creates duplicate in same tenant -> rejected with PIPELINE_NAME_ALREADY_EXISTS
    const resADuplicate = await createPipeline(authA, {
      name: pipelineName,
      stages: baseStages,
    });
    expect(resADuplicate.ok).toBe(false);
    if (!resADuplicate.ok) {
      expect(resADuplicate.error.code).toBe("PIPELINE_NAME_ALREADY_EXISTS");
    }
  });

  it("creates v1 DRAFT, publishes it, and validates publishedAt in PostgreSQL", async () => {
    const createRes = await createPipeline(authA, {
      name: "Pipeline Lifecycle",
      stages: baseStages,
    });
    expect(createRes.ok).toBe(true);
    if (!createRes.ok) throw new Error("createPipeline failed");
    const v1 = createRes.value;

    expect(v1.version).toBe(1);
    expect(v1.status).toBe("DRAFT");
    expect(v1.publishedAt).toBeNull();

    // Publish v1
    const pubRes = await publishPipelineVersion(authA, { versionId: v1.id });
    expect(pubRes.ok).toBe(true);
    if (!pubRes.ok) throw new Error("publishPipelineVersion failed");
    const publishedV1 = pubRes.value;

    expect(publishedV1.status).toBe("PUBLISHED");
    expect(publishedV1.publishedAt).not.toBeNull();

    // Direct DB check
    const dbRow = await prisma.pipelineVersion.findUnique({
      where: { id: v1.id },
    });
    expect(dbRow?.status).toBe("PUBLISHED");
    expect(dbRow?.publishedAt).not.toBeNull();
  });

  it("proves published snapshot immutability: v1 remains unchanged when v2 is edited", async () => {
    // 1. Create pipeline with initial stages: A, B, C
    const stagesV1: StageInput[] = [
      { name: "Stage A", category: "APPLIED", order: 1, isInitial: true },
      { name: "Stage B", category: "SCREENING", order: 2, isInitial: false },
      { name: "Stage C", category: "OFFER", order: 3, isInitial: false },
    ];

    const createRes = await createPipeline(authA, {
      name: "Pipeline Immutability Demo",
      stages: stagesV1,
    });
    if (!createRes.ok) throw new Error("createPipeline failed");
    const v1 = createRes.value;

    // Publish v1
    await publishPipelineVersion(authA, { versionId: v1.id });

    // 2. Create v2 DRAFT (clones v1 stages)
    const v2Res = await createPipelineVersion(authA, {
      pipelineId: v1.pipelineId,
    });
    expect(v2Res.ok).toBe(true);
    if (!v2Res.ok) throw new Error("createPipelineVersion failed");
    const v2 = v2Res.value;
    expect(v2.version).toBe(2);
    expect(v2.status).toBe("DRAFT");

    // 3. Update v2 to A, B, D
    const stagesV2: StageInput[] = [
      { name: "Stage A", category: "APPLIED", order: 1, isInitial: true },
      { name: "Stage B", category: "SCREENING", order: 2, isInitial: false },
      { name: "Stage D", category: "OFFER", order: 3, isInitial: false },
    ];

    const updateRes = await updateDraftPipelineVersion(authA, {
      versionId: v2.id,
      stages: stagesV2,
    });
    expect(updateRes.ok).toBe(true);

    // 4. Assert direct PostgreSQL state: v1 stages are still A, B, C!
    const v1Db = await prisma.pipelineVersion.findUnique({
      where: { id: v1.id },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    const v2Db = await prisma.pipelineVersion.findUnique({
      where: { id: v2.id },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    expect(v1Db?.stages.map((s) => s.name)).toEqual([
      "Stage A",
      "Stage B",
      "Stage C",
    ]);
    expect(v2Db?.stages.map((s) => s.name)).toEqual([
      "Stage A",
      "Stage B",
      "Stage D",
    ]);
  });

  it("rejects modifying a PUBLISHED version with PIPELINE_VERSION_IMMUTABLE", async () => {
    const createRes = await createPipeline(authA, {
      name: "Pipeline Freeze Check",
      stages: baseStages,
    });
    if (!createRes.ok) throw new Error("createPipeline failed");
    const v1 = createRes.value;
    await publishPipelineVersion(authA, { versionId: v1.id });

    const updateAttempt = await updateDraftPipelineVersion(authA, {
      versionId: v1.id,
      stages: baseStages,
    });

    expect(updateAttempt.ok).toBe(false);
    if (!updateAttempt.ok) {
      expect(updateAttempt.error.code).toBe("PIPELINE_VERSION_IMMUTABLE");
    }
  });

  it("enforces tenant isolation: Tenant B cannot resolve or mutate Tenant A resources", async () => {
    const createRes = await createPipeline(authA, {
      name: "Pipeline Secret Tenant A",
      stages: baseStages,
    });
    if (!createRes.ok) throw new Error("createPipeline failed");
    const v1 = createRes.value;
    await publishPipelineVersion(authA, { versionId: v1.id });

    // 1. Tenant B tries to resolve Tenant A's version
    const resolveRes = await resolvePipelineVersion(authB, {
      versionId: v1.id,
    });
    expect(resolveRes.ok).toBe(false);
    if (!resolveRes.ok) {
      expect(resolveRes.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
    }

    // 2. Tenant B tries to update Tenant A's version
    const updateRes = await updateDraftPipelineVersion(authB, {
      versionId: v1.id,
      stages: baseStages,
    });
    expect(updateRes.ok).toBe(false);
    if (!updateRes.ok) {
      expect(updateRes.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
    }

    // 3. Tenant B tries to create version on Tenant A's pipeline
    const createVerRes = await createPipelineVersion(authB, {
      pipelineId: v1.pipelineId,
    });
    expect(createVerRes.ok).toBe(false);
    if (!createVerRes.ok) {
      expect(createVerRes.error.code).toBe("PIPELINE_NOT_FOUND");
    }
  });
});
