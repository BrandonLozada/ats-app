import { Result, ok, err } from "@/platform/shared/result";
import type { CurrentActor } from "@/modules/identity/public.server";
import type {
  AuthenticatedContext,
  AuthenticatedResolutionError,
} from "./authenticated-context";
import type { PublicTenantContext } from "./public-tenant-context";
import type { PublicTenantResolutionError } from "./resolve-public-tenant-context";
import type { AuthenticatedMembershipReader } from "./ports/authenticated-membership-reader";

export interface AuthenticatedContextResolverDependencies {
  readonly resolveActor: () => Promise<CurrentActor | null>;
  readonly resolveTenant: (
    slug: string,
  ) => Promise<Result<PublicTenantContext, PublicTenantResolutionError>>;
  readonly membershipReader: AuthenticatedMembershipReader;
}

/**
 * Creates a resolveAuthenticatedContext resolver using provided dependencies.
 * Pure application logic without Prisma or framework dependencies.
 */
export function createAuthenticatedContextResolver({
  resolveActor,
  resolveTenant,
  membershipReader,
}: AuthenticatedContextResolverDependencies) {
  return async function resolveAuthenticatedContext(
    tenantSlug: string,
  ): Promise<Result<AuthenticatedContext, AuthenticatedResolutionError>> {
    // 1. Resolve CurrentActor from Identity
    const actor = await resolveActor();
    if (!actor) {
      return err({
        code: "UNAUTHENTICATED",
        message: "Authentication required to resolve tenant context.",
      });
    }

    // 2. Resolve Tenant from tenantSlug (reuses verified public tenant resolution)
    const tenantResult = await resolveTenant(tenantSlug);
    if (!tenantResult.ok) {
      if (tenantResult.error.code === "INVALID_TENANT_SLUG") {
        return err({
          code: "INVALID_TENANT_SLUG",
          message: tenantResult.error.message,
        });
      }
      // Fail closed: Missing or inactive tenant returns NotFound
      return err({
        code: "NOT_FOUND",
        reason: "TENANT_NOT_FOUND",
        message: `Tenant '${tenantSlug}' not found or inactive.`,
      });
    }

    const tenant = tenantResult.value;

    // 3. Resolve ACTIVE TenantMembership for actor + tenant
    const membership = await membershipReader.findActiveForUserInTenant(
      actor.userId,
      tenant.tenantId,
    );

    if (!membership) {
      // Fail closed: Missing or inactive membership returns NotFound (identical message to prevent existence leak)
      return err({
        code: "NOT_FOUND",
        reason: "MEMBERSHIP_NOT_FOUND",
        message: `Tenant '${tenantSlug}' not found or inactive.`,
      });
    }

    // 4. Construct and return AuthenticatedContext
    const context: AuthenticatedContext = {
      actor: {
        userId: actor.userId,
        email: actor.email,
        name: actor.name,
      },
      tenant: {
        tenantId: tenant.tenantId,
        slug: tenant.slug,
        name: tenant.name,
      },
      membership: {
        membershipId: membership.membershipId,
      },
      roles: membership.roles,
      permissions: membership.permissions,
    };

    return ok(context);
  };
}
