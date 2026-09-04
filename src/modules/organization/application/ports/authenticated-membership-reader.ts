export type AuthenticatedMembershipRecord = {
  readonly membershipId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
};

export interface AuthenticatedMembershipReader {
  findActiveForUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<AuthenticatedMembershipRecord | null>;
}
