import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { transactionPort } from "@/platform/transaction/public.server";
import type { TransactionContext } from "@/platform/transaction/public";
import {
  resolvePrismaClient,
  InvalidTransactionContextError,
} from "@/platform/transaction/prisma-transaction-client.server";

describe("TransactionPort Integration Tests (Real PostgreSQL)", () => {
  const tenant1Id = "98400000-0000-4000-e000-000000000001";
  const tenant2Id = "98400000-0000-4000-e000-000000000002";
  const tenant3Id = "98400000-0000-4000-e000-000000000003";
  const tenant4Id = "98400000-0000-4000-e000-000000000004";

  const source1Id = "98400000-0000-4000-e000-000000000011";
  const source2Id = "98400000-0000-4000-e000-000000000012";

  const allTenantIds = [tenant1Id, tenant2Id, tenant3Id, tenant4Id];
  const allSourceIds = [source1Id, source2Id];

  async function cleanup() {
    await prisma.applicationSource.deleteMany({
      where: { id: { in: allSourceIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: allTenantIds } },
    });
  }

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();

    // Verify deterministic namespace is completely clean
    const residualTenants = await prisma.tenant.count({
      where: { id: { in: allTenantIds } },
    });
    const residualSources = await prisma.applicationSource.count({
      where: { id: { in: allSourceIds } },
    });

    expect(residualTenants).toBe(0);
    expect(residualSources).toBe(0);
  });

  describe("Real PostgreSQL Commit Test", () => {
    it("persists writes executed within transactionPort.run upon normal resolution", async () => {
      const result = await transactionPort.run(async (ctx) => {
        const db = resolvePrismaClient(ctx);

        await db.tenant.create({
          data: {
            id: tenant1Id,
            name: "Commit Test Tenant",
            slug: "commit-test-tenant-984",
          },
        });

        return { committed: true, tenantId: tenant1Id };
      });

      expect(result).toEqual({ committed: true, tenantId: tenant1Id });

      // Verify row exists in PostgreSQL via root client
      const persistedTenant = await prisma.tenant.findUnique({
        where: { id: tenant1Id },
      });

      expect(persistedTenant).not.toBeNull();
      expect(persistedTenant?.id).toBe(tenant1Id);
      expect(persistedTenant?.slug).toBe("commit-test-tenant-984");
    });
  });

  describe("Real PostgreSQL Rollback Test", () => {
    it("rolls back all writes when work throws an explicit exception", async () => {
      const runPromise = transactionPort.run(async (ctx) => {
        const db = resolvePrismaClient(ctx);

        await db.tenant.create({
          data: {
            id: tenant2Id,
            name: "Rollback Test Tenant A",
            slug: "rollback-test-tenant-a-984",
          },
        });

        await db.tenant.create({
          data: {
            id: tenant3Id,
            name: "Rollback Test Tenant B",
            slug: "rollback-test-tenant-b-984",
          },
        });

        throw new Error("Simulated business failure forcing rollback");
      });

      await expect(runPromise).rejects.toThrow(
        "Simulated business failure forcing rollback"
      );

      // Verify neither row exists in database
      const tenantA = await prisma.tenant.findUnique({
        where: { id: tenant2Id },
      });
      const tenantB = await prisma.tenant.findUnique({
        where: { id: tenant3Id },
      });

      expect(tenantA).toBeNull();
      expect(tenantB).toBeNull();
    });
  });

  describe("Multi-Repository / Multi-Table Atomicity Proof", () => {
    it("rolls back multiple tables atomically when an exception occurs after both writes", async () => {
      const multiWritePromise = transactionPort.run(async (ctx) => {
        const db = resolvePrismaClient(ctx);

        // 1. Write to Tenant table
        await db.tenant.create({
          data: {
            id: tenant4Id,
            name: "Multi-Table Rollback Tenant",
            slug: "multi-table-rollback-tenant-984",
          },
        });

        // 2. Write to ApplicationSource table
        await db.applicationSource.create({
          data: {
            id: source1Id,
            name: "Multi-Table Rollback Source",
            type: "EXTERNAL",
            isActive: true,
          },
        });

        // Verify intra-transaction visibility (read-your-own-writes inside tx)
        const insideTenant = await db.tenant.findUnique({
          where: { id: tenant4Id },
        });
        const insideSource = await db.applicationSource.findUnique({
          where: { id: source1Id },
        });
        expect(insideTenant).not.toBeNull();
        expect(insideSource).not.toBeNull();

        // 3. Force failure
        throw new Error("Forced multi-table rollback signal");
      });

      await expect(multiWritePromise).rejects.toThrow(
        "Forced multi-table rollback signal"
      );

      // Verify BOTH tables rolled back atomically
      const outsideTenant = await prisma.tenant.findUnique({
        where: { id: tenant4Id },
      });
      const outsideSource = await prisma.applicationSource.findUnique({
        where: { id: source1Id },
      });

      expect(outsideTenant).toBeNull();
      expect(outsideSource).toBeNull();
    });

    it("commits writes across multiple tables atomically upon normal callback resolution", async () => {
      await transactionPort.run(async (ctx) => {
        const db = resolvePrismaClient(ctx);

        await db.tenant.create({
          data: {
            id: tenant4Id,
            name: "Multi-Table Commit Tenant",
            slug: "multi-table-commit-tenant-984",
          },
        });

        await db.applicationSource.create({
          data: {
            id: source1Id,
            name: "Multi-Table Commit Source",
            type: "EXTERNAL",
            isActive: true,
          },
        });
      });

      // Verify both tables have rows committed
      const outsideTenant = await prisma.tenant.findUnique({
        where: { id: tenant4Id },
      });
      const outsideSource = await prisma.applicationSource.findUnique({
        where: { id: source1Id },
      });

      expect(outsideTenant).not.toBeNull();
      expect(outsideTenant?.id).toBe(tenant4Id);
      expect(outsideSource).not.toBeNull();
      expect(outsideSource?.id).toBe(source1Id);
    });
  });

  describe("Rollback on Database Constraint Violation", () => {
    it("rolls back preceding valid writes when database throws a constraint error", async () => {
      const constraintPromise = transactionPort.run(async (ctx) => {
        const db = resolvePrismaClient(ctx);

        // 1. Insert valid row
        await db.tenant.create({
          data: {
            id: tenant2Id,
            name: "Constraint Test Tenant First",
            slug: "constraint-test-tenant-unique-984",
          },
        });

        // 2. Insert row violating unique constraint on slug
        await db.tenant.create({
          data: {
            id: tenant3Id,
            name: "Constraint Test Tenant Duplicate Slug",
            slug: "constraint-test-tenant-unique-984", // duplicate slug
          },
        });
      });

      await expect(constraintPromise).rejects.toThrow();

      // Verify the first insert was also rolled back
      const firstTenant = await prisma.tenant.findUnique({
        where: { id: tenant2Id },
      });
      const secondTenant = await prisma.tenant.findUnique({
        where: { id: tenant3Id },
      });

      expect(firstTenant).toBeNull();
      expect(secondTenant).toBeNull();
    });
  });

  describe("Context Identity and Safety", () => {
    it("resolves the exact same transaction client identity within a run callback", async () => {
      await transactionPort.run(async (ctx) => {
        const db1 = resolvePrismaClient(ctx);
        const db2 = resolvePrismaClient(ctx);

        expect(db1).toBe(db2);
        expect(db1).not.toBe(prisma);
      });
    });

    it("expires the context immediately after callback completion and fails closed", async () => {
      let capturedCtx: TransactionContext | null = null;

      await transactionPort.run(async (ctx) => {
        capturedCtx = ctx;
        const db = resolvePrismaClient(ctx);
        expect(db).not.toBe(prisma);
      });

      expect(capturedCtx).not.toBeNull();

      // Attempting to resolve with the expired context MUST throw and never fall back to root prisma
      expect(() => resolvePrismaClient(capturedCtx!)).toThrow(
        InvalidTransactionContextError
      );
    });

    it("rejects caller-fabricated context tokens and fails closed", () => {
      const fakeCtx: TransactionContext = {
        id: Symbol("fabricated-context"),
      };

      expect(() => resolvePrismaClient(fakeCtx)).toThrow(
        InvalidTransactionContextError
      );
    });

    it("resolves root prisma client when context is strictly undefined", () => {
      const rootDb = resolvePrismaClient(undefined);
      expect(rootDb).toBe(prisma);
    });
  });
});
