export interface StageWithPipelineVersion {
  version: {
    pipelineId: string;
  };
}

export function ensureSamePipeline(
  fromStage: StageWithPipelineVersion,
  toStage: StageWithPipelineVersion,
) {
  if (fromStage.version.pipelineId !== toStage.version.pipelineId) {
    throw new Error("Stages belong to different pipelines");
  }
}
