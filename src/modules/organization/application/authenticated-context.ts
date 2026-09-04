export type AuthenticatedContext = {
  readonly actor: {
    readonly userId: string;
    readonly email: string;
    readonly name: string;
  };

  readonly tenant: {
    readonly tenantId: string;
    readonly slug: string;
    readonly name: string;
  };

  readonly membership: {
    readonly membershipId: string;
  };

  readonly roles: readonly string[];
  readonly permissions: readonly string[];
};

export type AuthenticatedResolutionError =
  | {
      readonly code: "UNAUTHENTICATED";
      readonly message: string;
    }
  | {
      readonly code: "NOT_FOUND";
      readonly reason: "TENANT_NOT_FOUND" | "MEMBERSHIP_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_TENANT_SLUG";
      readonly message: string;
    };
