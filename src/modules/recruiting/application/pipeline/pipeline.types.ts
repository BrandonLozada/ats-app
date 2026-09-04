export type StageCategory =
  | "APPLIED"
  | "SCREENING"
  | "CONTACT"
  | "INTERVIEW"
  | "ASSESSMENT"
  | "DOCUMENTATION"
  | "OFFER"
  | "OTHER";

export const STAGE_CATEGORIES = [
  "APPLIED",
  "SCREENING",
  "CONTACT",
  "INTERVIEW",
  "ASSESSMENT",
  "DOCUMENTATION",
  "OFFER",
  "OTHER",
] as const;

export type PipelineVersionStatus = "DRAFT" | "PUBLISHED";

export type PipelineStageRecord = {
  readonly id: string;
  readonly name: string;
  readonly category: StageCategory;
  readonly order: number;
  readonly isInitial: boolean;
};

export type PipelineVersionRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly pipelineId: string;
  readonly version: number;
  readonly status: PipelineVersionStatus;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly stages: readonly PipelineStageRecord[];
};

export type HiringPipelineRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly versions?: readonly PipelineVersionRecord[];
};

export type StageInput = {
  readonly name: string;
  readonly category: StageCategory;
  readonly order: number;
  readonly isInitial: boolean;
};
