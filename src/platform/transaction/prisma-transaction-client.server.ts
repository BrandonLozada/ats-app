import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { TransactionContext } from "./transaction.port";
import { getTransactionClient } from "./prisma-transaction-registry.server";

/**
 * Combined database client type for infrastructure repositories.
 * Can be either the canonical root PrismaClient or an active Prisma.TransactionClient.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Infrastructure-only error thrown when an invalid, foreign, malformed, or expired
 * TransactionContext is supplied to resolvePrismaClient.
 *
 * This error indicates programmer/infrastructure misuse and fails closed to prevent
 * accidental operations executing outside the intended transaction scope.
 */
export class InvalidTransactionContextError extends Error {
  constructor(message = "Invalid or expired transaction context provided.") {
    super(message);
    this.name = "InvalidTransactionContextError";
  }
}

/**
 * Server-only infrastructure resolver helper.
 *
 * Translates an optional TransactionContext into the appropriate Prisma client.
 *
 * Resolution Rules:
 * 1. undefined -> returns canonical root Prisma client (prisma).
 * 2. Active, registered TransactionContext -> returns the bound Prisma.TransactionClient.
 * 3. Unknown, expired, null, or fabricated context -> throws InvalidTransactionContextError (fails closed).
 *
 * Critical Safety Requirement:
 * Under NO circumstances does this function fall back to the root Prisma client when an
 * invalid, foreign, or expired context is provided. Doing so could silently write outside
 * the intended transaction boundary.
 *
 * Boundary Rule:
 * - Allowed Consumers: src/modules/* /infrastructure/** adapters only.
 * - Forbidden: src/modules/** /application/**, src/modules/** /domain/**, and public.ts.
 *
 * @param ctx Optional opaque TransactionContext.
 * @returns Either the canonical root PrismaClient or the active Prisma.TransactionClient.
 * @throws InvalidTransactionContextError if ctx is provided but not actively registered.
 */
export function resolvePrismaClient(ctx?: TransactionContext): DbClient {
  if (ctx === undefined) {
    return prisma;
  }

  if (!ctx || typeof ctx !== "object" || !("id" in ctx)) {
    throw new InvalidTransactionContextError(
      "Malformed or non-object transaction context provided."
    );
  }

  const tx = getTransactionClient(ctx);
  if (!tx) {
    throw new InvalidTransactionContextError(
      "Transaction context is expired, unknown, or not associated with an active transaction."
    );
  }

  return tx;
}
