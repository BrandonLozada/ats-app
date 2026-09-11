import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type { TransactionContext, TransactionPort } from "./transaction.port";
import {
  registerTransactionClient,
  unregisterTransactionClient,
} from "./prisma-transaction-registry.server";

/**
 * PostgreSQL Prisma adapter implementing TransactionPort.
 *
 * Provides atomic, isolated transaction boundaries using Prisma's interactive
 * $transaction API without exposing Prisma types to application or domain layers.
 *
 * Operational Semantics:
 * 1. Begins an interactive database transaction via Prisma singleton.
 * 2. Creates an opaque, nominal TransactionContext token containing only a unique Symbol.
 * 3. Associates TransactionContext -> Prisma.TransactionClient in an encapsulated private WeakMap.
 * 4. Invokes the caller's work(ctx) callback.
 * 5. If work resolves, the transaction commits and the resolved value is returned.
 * 6. If work throws an exception, the transaction rolls back and the exception propagates upward.
 * 7. In all outcomes (resolve or throw), unregisters the context so it immediately expires.
 *
 * Result<T, E> Policy:
 * TransactionPort does NOT inspect the resolved value of work(ctx). A returned Result (including
 * failure results such as { ok: false, error: ... }) is a normal resolved value and triggers a COMMIT.
 * Rollback occurs ONLY on thrown exceptions. To trigger a rollback in orchestrated workflows,
 * the caller must throw an internal transaction-abort signal.
 *
 * Nested Transaction Policy:
 * Nested transactions and savepoints are NOT supported. Callers must pass the existing
 * TransactionContext to downstream repositories instead of calling TransactionPort.run() recursively.
 */
export class PrismaTransactionAdapter implements TransactionPort {
  /**
   * Executes the provided unit of work within an atomic Prisma transaction.
   *
   * @param work Callback receiving the opaque TransactionContext to be propagated to repositories.
   * @returns The resolved value of the work callback.
   * @throws Any error thrown by the callback or the database, triggering a rollback.
   */
  async run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return await prisma.$transaction(async (tx) => {
      const ctx: TransactionContext = Object.freeze({
        id: Symbol("TransactionContext"),
      });

      registerTransactionClient(ctx, tx);

      try {
        return await work(ctx);
      } finally {
        unregisterTransactionClient(ctx);
      }
    });
  }
}
