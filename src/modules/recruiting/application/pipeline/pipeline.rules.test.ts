import { describe, it, expect } from "vitest";
import {
  ensureCanManagePipeline,
  validatePipelineStages,
} from "./pipeline.rules";
import { StageInput } from "./pipeline.types";

describe("Pipeline Stage Rules (Unit)", () => {
  const validStages: StageInput[] = [
    { name: "Postulación", category: "APPLIED", order: 1, isInitial: true },
    { name: "Filtro Telefónico", category: "SCREENING", order: 2, isInitial: false },
    { name: "Entrevista RRHH", category: "INTERVIEW", order: 3, isInitial: false },
    { name: "Entrevista Técnica", category: "INTERVIEW", order: 4, isInitial: false },
    { name: "Oferta", category: "OFFER", order: 5, isInitial: false },
  ];

  it("passes for a valid stage set with repeated categories", () => {
    const result = validatePipelineStages(validStages);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(5);
    }
  });

  it("rejects empty or null stage list", () => {
    const emptyResult = validatePipelineStages([]);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) {
      expect(emptyResult.error.code).toBe("INVALID_PIPELINE_STAGES");
    }

    // @ts-expect-error - testing null safety
    const nullResult = validatePipelineStages(null);
    expect(nullResult.ok).toBe(false);
  });

  it("rejects when no initial stage is defined", () => {
    const noInitial = validStages.map((s) => ({ ...s, isInitial: false }));
    const result = validatePipelineStages(noInitial);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("exactly one initial stage");
    }
  });

  it("rejects when multiple initial stages are defined", () => {
    const multiInitial = validStages.map((s) => ({ ...s, isInitial: true }));
    const result = validatePipelineStages(multiInitial);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("multiple initial stages");
    }
  });

  it("rejects when initial stage category is not APPLIED", () => {
    const invalidInitialCategory: StageInput[] = [
      { name: "Filtro", category: "SCREENING", order: 1, isInitial: true },
      { name: "Entrevista", category: "INTERVIEW", order: 2, isInitial: false },
    ];
    const result = validatePipelineStages(invalidInitialCategory);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("must have category 'APPLIED'");
    }
  });

  it("rejects empty or whitespace-only stage names", () => {
    const emptyName: StageInput[] = [
      { name: "   ", category: "APPLIED", order: 1, isInitial: true },
      { name: "Filtro", category: "SCREENING", order: 2, isInitial: false },
    ];
    const result = validatePipelineStages(emptyName);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("empty or invalid name");
    }
  });

  it("rejects invalid stage category", () => {
    const invalidCategory: StageInput[] = [
      {
        name: "Inicio",
        // @ts-expect-error - testing invalid category
        category: "UNKNOWN_CAT",
        order: 1,
        isInitial: true,
      },
    ];
    const result = validatePipelineStages(invalidCategory);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("invalid category");
    }
  });

  it("rejects non-positive order (order <= 0)", () => {
    const nonPositive: StageInput[] = [
      { name: "Inicio", category: "APPLIED", order: 0, isInitial: true },
      { name: "Filtro", category: "SCREENING", order: 1, isInitial: false },
    ];
    const result = validatePipelineStages(nonPositive);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("positive integer");
    }
  });

  it("rejects duplicate order within a version", () => {
    const duplicateOrder: StageInput[] = [
      { name: "Inicio", category: "APPLIED", order: 1, isInitial: true },
      { name: "Filtro", category: "SCREENING", order: 1, isInitial: false },
    ];
    const result = validatePipelineStages(duplicateOrder);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("unique");
    }
  });

  it("rejects non-contiguous order gaps (e.g. 1, 3)", () => {
    const gappedOrder: StageInput[] = [
      { name: "Inicio", category: "APPLIED", order: 1, isInitial: true },
      { name: "Filtro", category: "SCREENING", order: 3, isInitial: false },
    ];
    const result = validatePipelineStages(gappedOrder);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PIPELINE_STAGES");
      expect(result.error.message).toContain("contiguous from 1 to 2");
    }
  });
});

describe("Pipeline Authorization Rules (Unit)", () => {
  it("allows when actor has 'pipeline.manage' permission", () => {
    const result = ensureCanManagePipeline(["pipeline.manage", "vacancy.read"]);
    expect(result.ok).toBe(true);
  });

  it("returns FORBIDDEN when actor lacks 'pipeline.manage' permission", () => {
    const result = ensureCanManagePipeline(["vacancy.create", "application.read"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
});
