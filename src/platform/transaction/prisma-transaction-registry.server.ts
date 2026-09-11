import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { TransactionContext } from "./transaction.port";

/**
 * Encapsulated platform-private registry associating opaque TransactionContext tokens
 * with live Prisma TransactionClient instances.
 *
 * Scoped strictly to the duration of an active transaction callback.
 * Entries are unregistered in the adapter's finally block to prevent leakage.
 *
 * Boundary Rule:
 * This file is PLATFORM-INTERNAL. Business modules (recruiting, organization, identity)
 * must NEVER import this file.
 */
const activeTransactionClients = new WeakMap<
  TransactionContext,
  Prisma.TransactionClient
>();

/**
 * Associates an opaque TransactionContext with an active Prisma TransactionClient.
 * Platform-internal helper called exclusively by PrismaTransactionAdapter.
 */
export function registerTransactionClient(
  ctx: TransactionContext,
  tx: Prisma.TransactionClient
): void {
  activeTransactionClients.set(ctx, tx);
}

/**
 * Removes the TransactionContext association from the private registry.
 * Platform-internal helper called exclusively by PrismaTransactionAdapter.
 */
export function unregisterTransactionClient(ctx: TransactionContext): void {
  activeTransactionClients.delete(ctx);
}

/**
 * Retrieves the bound Prisma.TransactionClient for an active TransactionContext if present.
 * Platform-internal helper called exclusively by the infrastructure resolver.
 */
export function getTransactionClient(
  ctx: TransactionContext
): Prisma.TransactionClient | undefined {
  return activeTransactionClients.get(ctx);
}
