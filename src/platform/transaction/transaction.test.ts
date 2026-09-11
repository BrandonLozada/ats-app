import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import type { Prisma } from "@/generated/prisma/client";
import {
  InvalidTransactionContextError,
  resolvePrismaClient,
} from "./prisma-transaction-client.server";
import {
  registerTransactionClient,
  unregisterTransactionClient,
} from "./prisma-transaction-registry.server";
import { PrismaTransactionAdapter } from "./prisma-transaction.adapter";
import type { TransactionContext } from "./transaction.port";
import { ok, err } from "@/platform/shared/result";

describe("Transaction Context & Resolver Unit Tests", () => {
  it("resolves root prisma client when ctx is undefined", () => {
    const client = resolvePrismaClient(undefined);
    expect(client).toBe(prisma);
  });

  it("throws InvalidTransactionContextError when ctx is null or non-object", () => {
    expect(() =>
      resolvePrismaClient(null as unknown as TransactionContext)
    ).toThrow(InvalidTransactionContextError);

    expect(() =>
      resolvePrismaClient(123 as unknown as TransactionContext)
    ).toThrow(InvalidTransactionContextError);

    expect(() =>
      resolvePrismaClient("invalid" as unknown as TransactionContext)
    ).toThrow(InvalidTransactionContextError);
  });

  it("throws InvalidTransactionContextError when ctx is a malformed object", () => {
    expect(() =>
      resolvePrismaClient({} as unknown as TransactionContext)
    ).toThrow(InvalidTransactionContextError);

    expect(() =>
      resolvePrismaClient({ name: "not-a-context" } as unknown as TransactionContext)
    ).toThrow(InvalidTransactionContextError);
  });

  it("throws InvalidTransactionContextError when ctx is fabricated by caller", () => {
    const fakeCtx: TransactionContext = {
      id: Symbol("fabricated"),
    };

    expect(() => resolvePrismaClient(fakeCtx)).toThrow(
      InvalidTransactionContextError
    );
  });

  it("resolves the registered transaction client while registered, and fails closed when unregistered", () => {
    const ctx: TransactionContext = Object.freeze({
      id: Symbol("test-ctx"),
    });
    const mockTx = { dummy: "tx-client" } as unknown as Prisma.TransactionClient;

    // Before registration -> throws
    expect(() => resolvePrismaClient(ctx)).toThrow(
      InvalidTransactionContextError
    );

    // Register
    registerTransactionClient(ctx, mockTx);
    expect(resolvePrismaClient(ctx)).toBe(mockTx);

    // Unregister -> throws (never falls back to root prisma)
    unregisterTransactionClient(ctx);
    expect(() => resolvePrismaClient(ctx)).toThrow(
      InvalidTransactionContextError
    );
    expect(resolvePrismaClient(undefined)).toBe(prisma);
  });
});

describe("PrismaTransactionAdapter Unit Tests", () => {
  it("executes work within $transaction, creates opaque frozen context, and resolves return value", async () => {
    const mockTx = { isMockTx: true } as unknown as Prisma.TransactionClient;
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (cb: unknown) => {
        return await (cb as (tx: Prisma.TransactionClient) => Promise<unknown>)(mockTx);
      });

    const adapter = new PrismaTransactionAdapter();

    let capturedCtx: TransactionContext | null = null;
    let resolvedClientInsideWork: unknown = null;

    const result = await adapter.run(async (ctx) => {
      capturedCtx = ctx;
      resolvedClientInsideWork = resolvePrismaClient(ctx);
      return { success: true, count: 42 };
    });

    expect(result).toEqual({ success: true, count: 42 });
    expect(transactionSpy).toHaveBeenCalledTimes(1);

    // Context assertions
    expect(capturedCtx).toBeDefined();
    expect(typeof capturedCtx!.id).toBe("symbol");
    expect(Object.isFrozen(capturedCtx)).toBe(true);
    expect(Object.keys(capturedCtx!)).toEqual(["id"]);

    // Client resolved inside callback was the transaction client
    expect(resolvedClientInsideWork).toBe(mockTx);

    // After callback completes, context MUST be expired
    expect(() => resolvePrismaClient(capturedCtx!)).toThrow(
      InvalidTransactionContextError
    );

    transactionSpy.mockRestore();
  });

  it("propagates original error and expires context when work throws", async () => {
    const mockTx = { isMockTx: true } as unknown as Prisma.TransactionClient;
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (cb: unknown) => {
        return await (cb as (tx: Prisma.TransactionClient) => Promise<unknown>)(mockTx);
      });

    const adapter = new PrismaTransactionAdapter();
    const expectedError = new Error("Business validation failure");

    let capturedCtx: TransactionContext | null = null;

    await expect(
      adapter.run(async (ctx) => {
        capturedCtx = ctx;
        expect(resolvePrismaClient(ctx)).toBe(mockTx);
        throw expectedError;
      })
    ).rejects.toThrow("Business validation failure");

    // Context must be expired after throw
    expect(capturedCtx).toBeDefined();
    expect(() => resolvePrismaClient(capturedCtx!)).toThrow(
      InvalidTransactionContextError
    );

    transactionSpy.mockRestore();
  });

  it("does NOT trigger rollback or error on Result with ok: false (preserves value as resolved)", async () => {
    const mockTx = { isMockTx: true } as unknown as Prisma.TransactionClient;
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (cb: unknown) => {
        return await (cb as (tx: Prisma.TransactionClient) => Promise<unknown>)(mockTx);
      });

    const adapter = new PrismaTransactionAdapter();

    const failureResult = err("DOMAIN_RULE_VIOLATED");
    const result = await adapter.run(async () => {
      return failureResult;
    });

    // Returned Result is preserved, no throw occurred
    expect(result).toEqual(err("DOMAIN_RULE_VIOLATED"));
    expect(result.ok).toBe(false);

    const successResult = ok({ created: true });
    const result2 = await adapter.run(async () => {
      return successResult;
    });
    expect(result2).toEqual(ok({ created: true }));

    transactionSpy.mockRestore();
  });
});
