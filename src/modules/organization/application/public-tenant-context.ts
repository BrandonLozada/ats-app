/**
 * PublicTenantContext
 *
 * Minimal, framework-independent read-only context representing
 * an active tenant resolved from a public route slug.
 */
export type PublicTenantContext = {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
};
