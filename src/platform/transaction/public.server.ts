import "server-only";

import type { TransactionPort } from "./transaction.port";
import { PrismaTransactionAdapter } from "./prisma-transaction.adapter";

/**
 * Canonical platform transaction port singleton.
 * Provides atomic, isolated transaction boundaries using PostgreSQL/Prisma.
 */
export const transactionPort: TransactionPort = new PrismaTransactionAdapter();

export type {
  TransactionContext,
  TransactionPort,
} from "./transaction.port";
