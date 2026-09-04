import { Result, ok, err } from "@/platform/shared/result";
import {
  StageInput,
  STAGE_CATEGORIES,
  StageCategory,
} from "./pipeline.types";
import { PipelineError } from "./pipeline.errors";

export function ensureCanManagePipeline(
  permissions: readonly string[]
): Result<true, PipelineError> {
  if (permissions.includes("pipeline.manage")) {
    return ok(true);
  }
  return err({
    code: "FORBIDDEN",
    message: "Insufficient permissions to manage pipelines.",
  });
}

export function validatePipelineStages(
  stages: readonly StageInput[]
): Result<readonly StageInput[], PipelineError> {
  if (!stages || stages.length === 0) {
    return err({
      code: "INVALID_PIPELINE_STAGES",
      message: "Pipeline must have at least one stage.",
    });
  }

  // 1. Validate each stage's name and category
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (!stage.name || stage.name.trim().length === 0) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: `Stage at index ${i} has an empty or invalid name.`,
      });
    }

    if (!STAGE_CATEGORIES.includes(stage.category as StageCategory)) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: `Stage "${stage.name}" has an invalid category: "${stage.category}".`,
      });
    }
  }

  // 2. Validate initial stage
  const initialStages = stages.filter((s) => s.isInitial);
  if (initialStages.length === 0) {
    return err({
      code: "INVALID_PIPELINE_STAGES",
      message: "Pipeline must have exactly one initial stage.",
    });
  }

  if (initialStages.length > 1) {
    return err({
      code: "INVALID_PIPELINE_STAGES",
      message: `Pipeline cannot have multiple initial stages (found ${initialStages.length}).`,
    });
  }

  const initialStage = initialStages[0];
  if (initialStage.category !== "APPLIED") {
    return err({
      code: "INVALID_PIPELINE_STAGES",
      message: `Initial stage must have category 'APPLIED' (found '${initialStage.category}').`,
    });
  }

  // 3. Validate stage ordering: positive, unique, contiguous 1..N
  const orders = stages.map((s) => s.order);

  // Positive integers
  for (const order of orders) {
    if (!Number.isInteger(order) || order <= 0) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: `Stage order must be a positive integer (found ${order}).`,
      });
    }
  }

  // Unique
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== stages.length) {
    return err({
      code: "INVALID_PIPELINE_STAGES",
      message: "Stage orders must be unique within a pipeline version.",
    });
  }

  // Contiguous 1..N
  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    const expected = i + 1;
    if (sortedOrders[i] !== expected) {
      return err({
        code: "INVALID_PIPELINE_STAGES",
        message: `Stage orders must be contiguous from 1 to ${stages.length} (missing order ${expected}).`,
      });
    }
  }

  return ok(stages);
}
