import { StageType } from "@/generated/prisma/client";

export class PipelineEngine {
  static FINAL_STAGES: StageType[] = ["HIRED", "REJECTED"];

  static isFinalStage(stageType: StageType): boolean {
    return this.FINAL_STAGES.includes(stageType);
  }

  static validateTransition(params: {
    currentStageType?: StageType | null;
    nextStageType: StageType;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currentStageType, nextStageType } = params;

    // No moverse desde estado final
    if (currentStageType && this.isFinalStage(currentStageType)) {
      throw new Error("Cannot move from a final stage");
    }

    // No volver a estado final si ya lo fue (extra opcional)
    // (puedes quitar esto si quieres permitir reopen)
  }
}
