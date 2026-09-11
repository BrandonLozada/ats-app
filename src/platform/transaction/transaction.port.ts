/**
 * Opaque nominal transaction context token.
 * Contains no database or transaction client references.
 * Passed through application boundaries to associate repository operations
 * with an ongoing transaction.
 *
 * Rules:
 * 1. In-process and server-only: valid ONLY during the execution of work() within TransactionPort.run().
 * 2. Do NOT retain, cache, serialize, or send over HTTP.
 * 3. Ordinary application code cannot fabricate a valid TransactionContext.
 */
export type TransactionContext = {
  readonly id: symbol;
};

/**
 * Framework-independent and framework-agnostic transaction boundary port.
 * Allows application use cases and orchestration workflows to execute multiple
 * repository operations within a single atomic database transaction without
 * importing database clients, Prisma types, or query APIs.
 *
 * Nested Transaction Policy:
 * - Nested transactions and savepoints are NOT supported.
 * - Callers must propagate an existing TransactionContext to repositories
 *   rather than invoking run() recursively.
 */
export interface TransactionPort {
  /**
   * Executes the provided unit of work within an atomic transaction.
   *
   * @param work Function receiving the opaque TransactionContext to be forwarded
   *             to transaction-aware repository methods.
   * @returns The resolved value of the work callback.
   * @throws Propagates any error thrown by work or database, triggering a rollback.
   */
  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
