import { describe, it, expect, vi, beforeEach } from "vitest";
import { moveStageUseCase } from "./use-cases/move-stage.use-case";
import { PrismaService } from "@/infrastructure/database/prisma.service";

// Mock dependencies
vi.mock("@/infrastructure/auth/create-context", () => ({
  createAppContext: vi.fn().mockResolvedValue({
    userId: "11111111-1111-4111-8111-111111111111",
  }),
}));

vi.mock("@/application/auth/guards", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/infrastructure/audit/audit.service", () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

type MockTransactionSpy = {
  mockImplementation: (
    fn: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>,
  ) => void;
};

describe("moveStageUseCase Compatibility (Real Hierarchy: PipelineStage -> PipelineVersion -> HiringPipeline)", () => {
  const pipelineAId = "22222222-2222-4222-8222-222222222222";
  const versionAId = "33333333-3333-4333-8333-333333333333";
  const stage1Id = "44444444-4444-4444-8444-444444444441";
  const stage2Id = "44444444-4444-4444-8444-444444444442";
  const crossPipelineStageId = "55555555-5555-4555-8555-555555555555";
  const appId = "66666666-6666-4666-8666-666666666666";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts move when target stage belongs to same pipeline via version (Pipeline A -> Pipeline A)", async () => {
    const mockTx = {
      application: {
        findUnique: vi.fn().mockResolvedValue({
          id: appId,
          stageId: stage1Id,
          stage: {
            id: stage1Id,
            name: "Applied",
            category: "APPLIED",
            pipelineVersionId: versionAId,
          },
          jobPosting: {
            id: "job-1",
            pipelineId: pipelineAId,
            pipeline: {
              id: pipelineAId,
              versions: [
                {
                  id: versionAId,
                  pipelineId: pipelineAId,
                  stages: [
                    { id: stage1Id, name: "Applied", order: 1, pipelineVersionId: versionAId },
                    { id: stage2Id, name: "Interview", order: 2, pipelineVersionId: versionAId },
                  ],
                },
              ],
            },
          },
        }),
        update: vi.fn().mockResolvedValue({
          id: appId,
          stageId: stage2Id,
        }),
      },
      applicationStageHistory: {
        create: vi.fn().mockResolvedValue({ id: "hist-1" }),
      },
    };

    (
      vi.spyOn(
        PrismaService.client,
        "$transaction",
      ) as unknown as MockTransactionSpy
    ).mockImplementation(async (callback) => {
      return callback(mockTx);
    });

    const result = await moveStageUseCase({
      applicationId: appId,
      toStageId: stage2Id,
      notes: "Moving candidate to next stage",
    });

    expect(result).toBeDefined();
    expect(result.stageId).toBe(stage2Id);
    expect(mockTx.application.update).toHaveBeenCalledWith({
      where: { id: appId },
      data: { stageId: stage2Id },
    });
  });

  it("rejects move when target stage does not belong to the job's pipeline versions", async () => {
    const mockTx = {
      application: {
        findUnique: vi.fn().mockResolvedValue({
          id: appId,
          stageId: stage1Id,
          stage: {
            id: stage1Id,
            name: "Applied",
            category: "APPLIED",
            pipelineVersionId: versionAId,
          },
          jobPosting: {
            id: "job-1",
            pipelineId: pipelineAId,
            pipeline: {
              id: pipelineAId,
              versions: [
                {
                  id: versionAId,
                  pipelineId: pipelineAId,
                  stages: [
                    { id: stage1Id, name: "Applied", order: 1, pipelineVersionId: versionAId },
                    { id: stage2Id, name: "Interview", order: 2, pipelineVersionId: versionAId },
                  ],
                },
              ],
            },
          },
        }),
        update: vi.fn(),
      },
      applicationStageHistory: {
        create: vi.fn(),
      },
    };

    (
      vi.spyOn(
        PrismaService.client,
        "$transaction",
      ) as unknown as MockTransactionSpy
    ).mockImplementation(async (callback) => {
      return callback(mockTx);
    });

    await expect(
      moveStageUseCase({
        applicationId: appId,
        toStageId: crossPipelineStageId,
      }),
    ).rejects.toThrow("Target stage not in same pipeline");

    expect(mockTx.application.update).not.toHaveBeenCalled();
  });
});
