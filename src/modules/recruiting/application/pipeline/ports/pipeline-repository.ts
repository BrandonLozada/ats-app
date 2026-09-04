import {
  HiringPipelineRecord,
  PipelineVersionRecord,
  StageInput,
} from "../pipeline.types";

export class PipelineNameAlreadyExistsException extends Error {
  constructor(message = "Pipeline name already exists in tenant.") {
    super(message);
    this.name = "PipelineNameAlreadyExistsException";
  }
}

export class PipelineDraftAlreadyExistsException extends Error {
  constructor(message = "A draft version already exists for this pipeline.") {
    super(message);
    this.name = "PipelineDraftAlreadyExistsException";
  }
}

export type CreatePipelineData = {
  readonly tenantId: string;
  readonly name: string;
  readonly isDefault?: boolean;
  readonly stages: readonly StageInput[];
};

export type CreateDraftVersionData = {
  readonly tenantId: string;
  readonly pipelineId: string;
  readonly version: number;
  readonly stages: readonly StageInput[];
};

export interface PipelineRepositoryPort {
  /**
   * Finds a pipeline by tenantId and pipelineId.
   * Returns null if not found or cross-tenant.
   */
  findPipelineById(
    tenantId: string,
    pipelineId: string
  ): Promise<HiringPipelineRecord | null>;

  /**
   * Finds a pipeline by tenantId and pipeline name.
   * Returns null if not found.
   */
  findPipelineByName(
    tenantId: string,
    name: string
  ): Promise<HiringPipelineRecord | null>;

  /**
   * Finds a version by tenantId and versionId, including its stages ordered by order asc.
   * Returns null if not found or cross-tenant.
   */
  findVersionById(
    tenantId: string,
    versionId: string
  ): Promise<PipelineVersionRecord | null>;

  /**
   * Finds all versions of a pipeline within a tenant, ordered by version asc.
   */
  findVersionsByPipelineId(
    tenantId: string,
    pipelineId: string
  ): Promise<readonly PipelineVersionRecord[]>;

  /**
   * Atomically creates a HiringPipeline, its v1 DRAFT PipelineVersion, and initial stages.
   * Throws PipelineNameAlreadyExistsException on duplicate name collision in tenant.
   */
  createPipelineWithDraftVersion(
    data: CreatePipelineData
  ): Promise<PipelineVersionRecord>;

  /**
   * Atomically creates a new DRAFT PipelineVersion with the given version number and stages.
   * Throws PipelineDraftAlreadyExistsException on collision.
   */
  createDraftVersion(
    data: CreateDraftVersionData
  ): Promise<PipelineVersionRecord>;

  /**
   * Atomically replaces stages for a DRAFT version.
   * Returns null if version not found or not in DRAFT status.
   */
  replaceDraftStages(
    tenantId: string,
    versionId: string,
    stages: readonly StageInput[]
  ): Promise<PipelineVersionRecord | null>;

  /**
   * Atomically publishes a DRAFT version, setting status = 'PUBLISHED' and publishedAt = timestamp.
   * Returns null if version not found or not in DRAFT status.
   */
  publishVersion(
    tenantId: string,
    versionId: string,
    publishedAt: Date
  ): Promise<PipelineVersionRecord | null>;

  /**
   * Resolves the latest PUBLISHED version for a pipeline within a tenant.
   * Returns null if no published version exists.
   */
  findLatestPublishedVersion(
    tenantId: string,
    pipelineId: string
  ): Promise<PipelineVersionRecord | null>;
}
