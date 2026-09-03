/**
 * PublicTenantRecord
 * Minimal data projection required by the PublicTenantReader port.
 */
export type PublicTenantRecord = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
};

/**
 * PublicTenantReader
 * Consumer-owned port for resolving public tenant information.
 * Does not import or leak Prisma.
 */
export interface PublicTenantReader {
  findActiveBySlug(slug: string): Promise<PublicTenantRecord | null>;
}
