import { describe, it, expect } from "vitest";
import { ok, err } from "@/platform/shared/result";
import type { CurrentActor } from "@/modules/identity/public.server";
import { createAuthenticatedContextResolver } from "./application/resolve-authenticated-context";
import type { PublicTenantContext } from "./application/public-tenant-context";
import type { PublicTenantResolutionError } from "./application/resolve-public-tenant-context";
import type {
  AuthenticatedMembershipReader,
  AuthenticatedMembershipRecord,
} from "./application/ports/authenticated-membership-reader";
import * as orgServer from "./public.server";
import * as orgClient from "./public";

describe("AuthenticatedContext Resolver (Unit / In-Memory)", () => {
  const actorAlice: CurrentActor = {
    userId: "user-alice-id",
    email: "alice@example.com",
    name: "Alice Recruiter",
  };

  const actorBob: CurrentActor = {
    userId: "user-bob-id",
    email: "bob@example.com",
    name: "Bob Admin",
  };

  const tenantAlpha: PublicTenantContext = {
    tenantId: "tenant-alpha-id",
    slug: "alpha-corp",
    name: "Alpha Corp",
  };

  const tenantBeta: PublicTenantContext = {
    tenantId: "tenant-beta-id",
    slug: "beta-corp",
    name: "Beta Corp",
  };

  // In-memory memberships: key = `${tenantId}:${userId}`
  const membershipStore = new Map<string, AuthenticatedMembershipRecord>([
    [
      `${tenantAlpha.tenantId}:${actorAlice.userId}`,
      {
        membershipId: "mem-alpha-alice",
        tenantId: tenantAlpha.tenantId,
        userId: actorAlice.userId,
        roles: ["RECRUITER"],
        permissions: ["candidate.read", "candidate.create"],
      },
    ],
    [
      `${tenantBeta.tenantId}:${actorAlice.userId}`,
      {
        membershipId: "mem-beta-alice",
        tenantId: tenantBeta.tenantId,
        userId: actorAlice.userId,
        roles: ["TENANT_ADMIN"],
        permissions: ["tenant.manage", "billing.read"],
      },
    ],
    [
      `${tenantAlpha.tenantId}:${actorBob.userId}`,
      {
        membershipId: "mem-alpha-bob",
        tenantId: tenantAlpha.tenantId,
        userId: actorBob.userId,
        roles: ["TENANT_ADMIN", "CUSTOM_REVIEWER"],
        permissions: ["tenant.manage", "application.review"],
      },
    ],
  ]);

  const fakeMembershipReader: AuthenticatedMembershipReader = {
    async findActiveForUserInTenant(
      userId: string,
      tenantId: string,
    ): Promise<AuthenticatedMembershipRecord | null> {
      const record = membershipStore.get(`${tenantId}:${userId}`);
      return record ?? null;
    },
  };

  const fakeResolveTenant = async (
    slug: string,
  ): Promise<{ ok: true; value: PublicTenantContext } | { ok: false; error: PublicTenantResolutionError }> => {
    if (!slug || slug.trim() === "") {
      return err({
        code: "INVALID_TENANT_SLUG",
        message: "Tenant slug cannot be empty or whitespace.",
      });
    }
    if (slug === "alpha-corp") return ok(tenantAlpha);
    if (slug === "beta-corp") return ok(tenantBeta);
    return err({
      code: "TENANT_NOT_FOUND",
      message: `Tenant '${slug}' was not found or is inactive.`,
    });
  };

  it("resolves AuthenticatedContext successfully for authenticated actor with active membership", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    const result = await resolver("alpha-corp");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        actor: {
          userId: "user-alice-id",
          email: "alice@example.com",
          name: "Alice Recruiter",
        },
        tenant: {
          tenantId: "tenant-alpha-id",
          slug: "alpha-corp",
          name: "Alpha Corp",
        },
        membership: {
          membershipId: "mem-alpha-alice",
        },
        roles: ["RECRUITER"],
        permissions: ["candidate.read", "candidate.create"],
      });

      // Assert no extra properties leaked
      expect(Object.keys(result.value)).toEqual([
        "actor",
        "tenant",
        "membership",
        "roles",
        "permissions",
      ]);
      expect(Object.keys(result.value.actor)).toEqual(["userId", "email", "name"]);
      expect(Object.keys(result.value.tenant)).toEqual(["tenantId", "slug", "name"]);
      expect(Object.keys(result.value.membership)).toEqual(["membershipId"]);
    }
  });

  it("yields UNAUTHENTICATED error when resolveCurrentActor returns null", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => null,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    const result = await resolver("alpha-corp");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
      expect(result.error.message).toContain("Authentication required");
    }
  });

  it("yields NotFound error when tenant is unknown/missing", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    const result = await resolver("unknown-hospital");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      if (result.error.code === "NOT_FOUND") {
        expect(result.error.reason).toBe("TENANT_NOT_FOUND");
      }
      expect(result.error.message).toBe("Tenant 'unknown-hospital' not found or inactive.");
    }
  });

  it("yields NotFound error when tenant is inactive", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: async () =>
        err({
          code: "TENANT_NOT_FOUND",
          message: "Tenant 'inactive-corp' was not found or is inactive.",
        }),
      membershipReader: fakeMembershipReader,
    });

    const result = await resolver("inactive-corp");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      if (result.error.code === "NOT_FOUND") {
        expect(result.error.reason).toBe("TENANT_NOT_FOUND");
      }
      expect(result.error.message).toBe("Tenant 'inactive-corp' not found or inactive.");
    }
  });

  it("yields NotFound error when actor has NO membership in tenant (fail-closed, no existence leak)", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorBob,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    // Bob has membership in Alpha Corp, but NOT in Beta Corp
    const result = await resolver("beta-corp");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      if (result.error.code === "NOT_FOUND") {
        expect(result.error.reason).toBe("MEMBERSHIP_NOT_FOUND");
      }
      // Critical security invariant: message must be identical to tenant not found
      expect(result.error.message).toBe("Tenant 'beta-corp' not found or inactive.");
    }
  });

  it("yields NotFound error when actor's membership is INACTIVE", async () => {
    // Reader returns null for inactive memberships (reader filters status = ACTIVE)
    const inactiveReader: AuthenticatedMembershipReader = {
      async findActiveForUserInTenant(): Promise<AuthenticatedMembershipRecord | null> {
        return null;
      },
    };

    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: fakeResolveTenant,
      membershipReader: inactiveReader,
    });

    const result = await resolver("alpha-corp");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      if (result.error.code === "NOT_FOUND") {
        expect(result.error.reason).toBe("MEMBERSHIP_NOT_FOUND");
      }
      expect(result.error.message).toBe("Tenant 'alpha-corp' not found or inactive.");
    }
  });

  it("enforces strict cross-tenant isolation: resolving Tenant A returns ONLY Tenant A roles and permissions", async () => {
    // Alice has memberships in both Alpha and Beta with different roles and permissions
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    const alphaResult = await resolver("alpha-corp");
    const betaResult = await resolver("beta-corp");

    expect(alphaResult.ok).toBe(true);
    expect(betaResult.ok).toBe(true);

    if (alphaResult.ok && betaResult.ok) {
      // Alpha: Recruiter role, candidate permissions
      expect(alphaResult.value.tenant.slug).toBe("alpha-corp");
      expect(alphaResult.value.membership.membershipId).toBe("mem-alpha-alice");
      expect(alphaResult.value.roles).toEqual(["RECRUITER"]);
      expect(alphaResult.value.permissions).toEqual(["candidate.read", "candidate.create"]);

      // Beta: Admin role, tenant.manage and billing.read
      expect(betaResult.value.tenant.slug).toBe("beta-corp");
      expect(betaResult.value.membership.membershipId).toBe("mem-beta-alice");
      expect(betaResult.value.roles).toEqual(["TENANT_ADMIN"]);
      expect(betaResult.value.permissions).toEqual(["tenant.manage", "billing.read"]);

      // Assert no union / leakage
      expect(alphaResult.value.roles).not.toContain("TENANT_ADMIN");
      expect(alphaResult.value.permissions).not.toContain("billing.read");
      expect(betaResult.value.roles).not.toContain("RECRUITER");
      expect(betaResult.value.permissions).not.toContain("candidate.read");
    }
  });

  it("yields INVALID_TENANT_SLUG when slug is empty or whitespace", async () => {
    const resolver = createAuthenticatedContextResolver({
      resolveActor: async () => actorAlice,
      resolveTenant: fakeResolveTenant,
      membershipReader: fakeMembershipReader,
    });

    const result = await resolver("   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TENANT_SLUG");
    }
  });
});

describe("Organization Public Server Boundary Exports", () => {
  it("exports resolveAuthenticatedContext as a callable function from public.server", () => {
    expect(typeof orgServer.resolveAuthenticatedContext).toBe("function");
    expect(typeof orgServer.resolvePublicTenantContext).toBe("function");
  });

  it("does not leak Prisma internals or database client via public.server", () => {
    expect("prisma" in orgServer).toBe(false);
    expect("PrismaAuthenticatedMembershipReader" in orgServer).toBe(false);
    expect("PrismaPublicTenantReader" in orgServer).toBe(false);
    expect("prismaAuthenticatedMembershipReader" in orgServer).toBe(false);
    expect("db" in orgServer).toBe(false);
    expect("PrismaClient" in orgServer).toBe(false);
  });

  it("does not leak Better Auth internals via public.server or public.ts", () => {
    expect("auth" in orgServer).toBe(false);
    expect("betterAuth" in orgServer).toBe(false);
    expect("auth" in orgClient).toBe(false);
    expect("betterAuth" in orgClient).toBe(false);
  });

  it("exports only pure type definitions from client-safe public.ts (no runtime functions)", () => {
    expect("resolveAuthenticatedContext" in orgClient).toBe(false);
    expect("resolvePublicTenantContext" in orgClient).toBe(false);
  });
});
