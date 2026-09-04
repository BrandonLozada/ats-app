import { describe, it, expect, beforeEach } from "vitest";
import {
  CreateDraftVersionData,
  CreatePipelineData,
  PipelineDraftAlreadyExistsException,
  PipelineNameAlreadyExistsException,
  PipelineRepositoryPort,
} from "./ports/pipeline-repository";
import type { AuthenticatedContext } from "@/modules/organization/public";
import {
  HiringPipelineRecord,
  PipelineVersionRecord,
  StageInput,
} from "./pipeline.types";
import { createPipelineUseCase } from "./create-pipeline";
import { createPipelineVersionUseCase } from "./create-pipeline-version";
import { updateDraftPipelineVersionUseCase } from "./update-draft-pipeline-version";
import { publishPipelineVersionUseCase } from "./publish-pipeline-version";
import {
  resolvePipelineVersionUseCase,
  resolveLatestPublishedPipelineVersionUseCase,
} from "./resolve-pipeline-version";

class FakePipelineRepository implements PipelineRepositoryPort {
  pipelines: HiringPipelineRecord[] = [];
  versions: PipelineVersionRecord[] = [];

  async findPipelineById(
    tenantId: string,
    pipelineId: string
  ): Promise<HiringPipelineRecord | null> {
    return (
      this.pipelines.find(
        (p) => p.id === pipelineId && p.tenantId === tenantId
      ) ?? null
    );
  }

  async findPipelineByName(
    tenantId: string,
    name: string
  ): Promise<HiringPipelineRecord | null> {
    return (
      this.pipelines.find(
        (p) => p.name === name && p.tenantId === tenantId
      ) ?? null
    );
  }

  async findVersionById(
    tenantId: string,
    versionId: string
  ): Promise<PipelineVersionRecord | null> {
    return (
      this.versions.find(
        (v) => v.id === versionId && v.tenantId === tenantId
      ) ?? null
    );
  }

  async findVersionsByPipelineId(
    tenantId: string,
    pipelineId: string
  ): Promise<readonly PipelineVersionRecord[]> {
    return this.versions
      .filter((v) => v.pipelineId === pipelineId && v.tenantId === tenantId)
      .sort((a, b) => a.version - b.version);
  }

  async createPipelineWithDraftVersion(
    data: CreatePipelineData
  ): Promise<PipelineVersionRecord> {
    const existing = this.pipelines.find(
      (p) => p.tenantId === data.tenantId && p.name === data.name
    );
    if (existing) {
      throw new PipelineNameAlreadyExistsException(
        `Pipeline with name "${data.name}" already exists in tenant.`
      );
    }

    const pipelineId = `pipe_${Date.now()}_${Math.random()}`;
    const pipeline: HiringPipelineRecord = {
      id: pipelineId,
      tenantId: data.tenantId,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.pipelines.push(pipeline);

    const versionId = `ver_${Date.now()}_${Math.random()}`;
    const version: PipelineVersionRecord = {
      id: versionId,
      tenantId: data.tenantId,
      pipelineId,
      version: 1,
      status: "DRAFT",
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      stages: data.stages.map((s, idx) => ({
        id: `stg_${idx + 1}`,
        name: s.name,
        category: s.category,
        order: s.order,
        isInitial: s.isInitial,
      })),
    };
    this.versions.push(version);

    return version;
  }

  async createDraftVersion(
    data: CreateDraftVersionData
  ): Promise<PipelineVersionRecord> {
    const existing = this.versions.find(
      (v) =>
        v.pipelineId === data.pipelineId &&
        v.version === data.version &&
        v.tenantId === data.tenantId
    );
    if (existing) {
      throw new PipelineDraftAlreadyExistsException(
        `Version ${data.version} already exists.`
      );
    }

    const versionId = `ver_${Date.now()}_${Math.random()}`;
    const version: PipelineVersionRecord = {
      id: versionId,
      tenantId: data.tenantId,
      pipelineId: data.pipelineId,
      version: data.version,
      status: "DRAFT",
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      stages: data.stages.map((s, idx) => ({
        id: `stg_${idx + 1}`,
        name: s.name,
        category: s.category,
        order: s.order,
        isInitial: s.isInitial,
      })),
    };
    this.versions.push(version);
    return version;
  }

  async replaceDraftStages(
    tenantId: string,
    versionId: string,
    stages: readonly StageInput[]
  ): Promise<PipelineVersionRecord | null> {
    const idx = this.versions.findIndex(
      (v) => v.id === versionId && v.tenantId === tenantId
    );
    if (idx === -1) return null;
    if (this.versions[idx].status !== "DRAFT") return null;

    const updated: PipelineVersionRecord = {
      ...this.versions[idx],
      updatedAt: new Date(),
      stages: stages.map((s, i) => ({
        id: `stg_new_${i + 1}`,
        name: s.name,
        category: s.category,
        order: s.order,
        isInitial: s.isInitial,
      })),
    };
    this.versions[idx] = updated;
    return updated;
  }

  async publishVersion(
    tenantId: string,
    versionId: string,
    publishedAt: Date
  ): Promise<PipelineVersionRecord | null> {
    const idx = this.versions.findIndex(
      (v) => v.id === versionId && v.tenantId === tenantId
    );
    if (idx === -1) return null;
    if (this.versions[idx].status !== "DRAFT") return null;

    const updated: PipelineVersionRecord = {
      ...this.versions[idx],
      status: "PUBLISHED",
      publishedAt,
      updatedAt: new Date(),
    };
    this.versions[idx] = updated;
    return updated;
  }

  async findLatestPublishedVersion(
    tenantId: string,
    pipelineId: string
  ): Promise<PipelineVersionRecord | null> {
    const published = this.versions
      .filter(
        (v) =>
          v.pipelineId === pipelineId &&
          v.tenantId === tenantId &&
          v.status === "PUBLISHED"
      )
      .sort((a, b) => b.version - a.version);

    return published[0] ?? null;
  }
}

describe("Pipeline Use Cases (Unit / In-Memory)", () => {
  let repo: FakePipelineRepository;
  const tenantA = "tenant_alpha";
  const tenantB = "tenant_beta";

  const authA: AuthenticatedContext = {
    actor: {
      userId: "usr_alpha",
      email: "recruiter_a@tenant-a.com",
      name: "Recruiter Alpha",
    },
    tenant: {
      tenantId: tenantA,
      slug: "tenant-a",
      name: "Tenant Alpha",
    },
    membership: {
      membershipId: "mem_alpha",
    },
    roles: ["RECRUITER"],
    permissions: ["pipeline.manage"],
  };

  const authB: AuthenticatedContext = {
    actor: {
      userId: "usr_beta",
      email: "recruiter_b@tenant-b.com",
      name: "Recruiter Beta",
    },
    tenant: {
      tenantId: tenantB,
      slug: "tenant-b",
      name: "Tenant Beta",
    },
    membership: {
      membershipId: "mem_beta",
    },
    roles: ["RECRUITER"],
    permissions: ["pipeline.manage"],
  };

  const authUnauthorized: AuthenticatedContext = {
    actor: {
      userId: "usr_alpha_viewer",
      email: "viewer_a@tenant-a.com",
      name: "Viewer Alpha",
    },
    tenant: {
      tenantId: tenantA,
      slug: "tenant-a",
      name: "Tenant Alpha",
    },
    membership: {
      membershipId: "mem_alpha_viewer",
    },
    roles: ["VIEWER"],
    permissions: ["application.read"],
  };

  const validStages: StageInput[] = [
    { name: "Postulación", category: "APPLIED", order: 1, isInitial: true },
    { name: "Filtro", category: "SCREENING", order: 2, isInitial: false },
    { name: "Entrevista", category: "INTERVIEW", order: 3, isInitial: false },
    { name: "Oferta", category: "OFFER", order: 4, isInitial: false },
  ];

  beforeEach(() => {
    repo = new FakePipelineRepository();
  });

  describe("createPipeline", () => {
    it("creates a new pipeline with v1 DRAFT and valid stages", async () => {
      const create = createPipelineUseCase(repo);
      const res = await create(authA, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.version).toBe(1);
        expect(res.value.status).toBe("DRAFT");
        expect(res.value.publishedAt).toBeNull();
        expect(res.value.stages.length).toBe(4);
        expect(res.value.stages[0].category).toBe("APPLIED");
        expect(res.value.stages[0].isInitial).toBe(true);
      }
    });

    it("rejects when actor lacks 'pipeline.manage' permission", async () => {
      const create = createPipelineUseCase(repo);
      const res = await create(authUnauthorized, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("FORBIDDEN");
      }
    });

    it("rejects duplicate pipeline name in the same tenant", async () => {
      const create = createPipelineUseCase(repo);
      await create(authA, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });

      const duplicate = await create(authA, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });

      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(duplicate.error.code).toBe("PIPELINE_NAME_ALREADY_EXISTS");
      }
    });

    it("allows the same pipeline name across different tenants", async () => {
      const create = createPipelineUseCase(repo);
      const resA = await create(authA, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });
      const resB = await create(authB, {
        name: "Pipeline Enfermería",
        stages: validStages,
      });

      expect(resA.ok).toBe(true);
      expect(resB.ok).toBe(true);
    });
  });

  describe("createPipelineVersion", () => {
    it("creates v2 DRAFT cloning stages from latest published v1", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);
      const createVersion = createPipelineVersionUseCase(repo);

      // 1. Create v1 DRAFT
      const v1Res = await createPipe(authA, {
        name: "Pipeline Médicos",
        stages: validStages,
      });
      expect(v1Res.ok).toBe(true);
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      // 2. Publish v1
      const pubRes = await publish(authA, { versionId: v1.id });
      expect(pubRes.ok).toBe(true);

      // 3. Create v2 DRAFT
      const v2Res = await createVersion(authA, { pipelineId: v1.pipelineId });
      expect(v2Res.ok).toBe(true);
      if (v2Res.ok) {
        expect(v2Res.value.version).toBe(2);
        expect(v2Res.value.status).toBe("DRAFT");
        expect(v2Res.value.publishedAt).toBeNull();
        expect(v2Res.value.stages.length).toBe(v1.stages.length);
        expect(v2Res.value.stages.map((s) => s.name)).toEqual(
          v1.stages.map((s) => s.name)
        );
      }
    });

    it("enforces ONE DRAFT rule: rejects creating new draft if draft already exists", async () => {
      const createPipe = createPipelineUseCase(repo);
      const createVersion = createPipelineVersionUseCase(repo);

      // v1 created as DRAFT
      const v1Res = await createPipe(authA, {
        name: "Pipeline TI",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      // Try creating v2 without publishing v1
      const v2Res = await createVersion(authA, { pipelineId: v1.pipelineId });
      expect(v2Res.ok).toBe(false);
      if (!v2Res.ok) {
        expect(v2Res.error.code).toBe("PIPELINE_DRAFT_ALREADY_EXISTS");
      }
    });

    it("rejects cross-tenant pipeline version creation with NOT_FOUND", async () => {
      const createPipe = createPipelineUseCase(repo);
      const createVersion = createPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Tenant A",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      // Tenant B tries to create a version on Tenant A's pipeline
      const res = await createVersion(authB, { pipelineId: v1.pipelineId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("PIPELINE_NOT_FOUND");
      }
    });
  });

  describe("updateDraftPipelineVersion", () => {
    it("allows replacing stages on a DRAFT version", async () => {
      const createPipe = createPipelineUseCase(repo);
      const updateDraftPipelineVersion = updateDraftPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Admin",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      const newStages: StageInput[] = [
        { name: "Postulación Directa", category: "APPLIED", order: 1, isInitial: true },
        { name: "Evaluación Psicométrica", category: "ASSESSMENT", order: 2, isInitial: false },
        { name: "Oferta Final", category: "OFFER", order: 3, isInitial: false },
      ];

      const updateRes = await updateDraftPipelineVersion(authA, {
        versionId: v1.id,
        stages: newStages,
      });

      expect(updateRes.ok).toBe(true);
      if (updateRes.ok) {
        expect(updateRes.value.stages.length).toBe(3);
        expect(updateRes.value.stages[0].name).toBe("Postulación Directa");
      }
    });

    it("rejects updating stages on a PUBLISHED version with PIPELINE_VERSION_IMMUTABLE", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);
      const updateDraftPipelineVersion = updateDraftPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Inmutable",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      await publish(authA, { versionId: v1.id });

      const updateRes = await updateDraftPipelineVersion(authA, {
        versionId: v1.id,
        stages: validStages,
      });

      expect(updateRes.ok).toBe(false);
      if (!updateRes.ok) {
        expect(updateRes.error.code).toBe("PIPELINE_VERSION_IMMUTABLE");
      }
    });

    it("rejects cross-tenant draft update with NOT_FOUND", async () => {
      const createPipe = createPipelineUseCase(repo);
      const updateDraftPipelineVersion = updateDraftPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Tenant A",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      const updateRes = await updateDraftPipelineVersion(authB, {
        versionId: v1.id,
        stages: validStages,
      });

      expect(updateRes.ok).toBe(false);
      if (!updateRes.ok) {
        expect(updateRes.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });
  });

  describe("publishPipelineVersion", () => {
    it("publishes a valid DRAFT version and populates publishedAt", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Publicable",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      const pubRes = await publish(authA, { versionId: v1.id });
      expect(pubRes.ok).toBe(true);
      if (pubRes.ok) {
        expect(pubRes.value.status).toBe("PUBLISHED");
        expect(pubRes.value.publishedAt).toBeInstanceOf(Date);
      }
    });

    it("rejects publishing an already PUBLISHED version", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Ya Publicado",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      await publish(authA, { versionId: v1.id });
      const pubAgain = await publish(authA, { versionId: v1.id });

      expect(pubAgain.ok).toBe(false);
      if (!pubAgain.ok) {
        expect(pubAgain.error.code).toBe("PIPELINE_VERSION_IMMUTABLE");
      }
    });

    it("rejects cross-tenant publish with NOT_FOUND", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Tenant A",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      const pubRes = await publish(authB, { versionId: v1.id });
      expect(pubRes.ok).toBe(false);
      if (!pubRes.ok) {
        expect(pubRes.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });
  });

  describe("resolvePipelineVersion & resolveLatestPublishedPipelineVersion", () => {
    it("resolves exact published version", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);
      const resolveExact = resolvePipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Resolvible",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;
      await publish(authA, { versionId: v1.id });

      const resolved = await resolveExact(authA, {
        versionId: v1.id,
      });

      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.value.id).toBe(v1.id);
        expect(resolved.value.status).toBe("PUBLISHED");
      }
    });

    it("rejects resolving a DRAFT version when published is required", async () => {
      const createPipe = createPipelineUseCase(repo);
      const resolveExact = resolvePipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Draft Only",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;

      const resolved = await resolveExact(authA, {
        versionId: v1.id,
      });

      expect(resolved.ok).toBe(false);
      if (!resolved.ok) {
        expect(resolved.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });

    it("rejects cross-tenant version resolution with NOT_FOUND", async () => {
      const createPipe = createPipelineUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);
      const resolveExact = resolvePipelineVersionUseCase(repo);

      const v1Res = await createPipe(authA, {
        name: "Pipeline Tenant A",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;
      await publish(authA, { versionId: v1.id });

      const resolved = await resolveExact(authB, {
        versionId: v1.id,
      });

      expect(resolved.ok).toBe(false);
      if (!resolved.ok) {
        expect(resolved.error.code).toBe("PIPELINE_VERSION_NOT_FOUND");
      }
    });

    it("resolves latest published version among multiple versions", async () => {
      const createPipe = createPipelineUseCase(repo);
      const createVersion = createPipelineVersionUseCase(repo);
      const publish = publishPipelineVersionUseCase(repo);
      const resolveLatest = resolveLatestPublishedPipelineVersionUseCase(repo);

      // Create and publish v1
      const v1Res = await createPipe(authA, {
        name: "Pipeline Multi",
        stages: validStages,
      });
      const v1 = (v1Res as { ok: true; value: PipelineVersionRecord }).value;
      await publish(authA, { versionId: v1.id });

      // Create and publish v2
      const v2Res = await createVersion(authA, { pipelineId: v1.pipelineId });
      const v2 = (v2Res as { ok: true; value: PipelineVersionRecord }).value;
      await publish(authA, { versionId: v2.id });

      // Create v3 DRAFT (not published)
      await createVersion(authA, { pipelineId: v1.pipelineId });

      // Latest published should be v2
      const latest = await resolveLatest(authA, {
        pipelineId: v1.pipelineId,
      });

      expect(latest.ok).toBe(true);
      if (latest.ok) {
        expect(latest.value.version).toBe(2);
        expect(latest.value.status).toBe("PUBLISHED");
      }
    });
  });
});
