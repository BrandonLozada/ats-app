export function ensureNotFinalStage(currentStage: any) {
  if (currentStage?.isFinal) {
    throw new Error("Cannot move from a final stage");
  }
}

export function ensureSamePipeline(fromStage: any, toStage: any) {
  if (fromStage.pipelineId !== toStage.pipelineId) {
    throw new Error("Stages belong to different pipelines");
  }
}
