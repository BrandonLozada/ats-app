import { describe, it, expect } from "vitest";
import * as orgServer from "./public.server";
import * as orgClient from "./public";
import { createPublicTenantResolver } from "./application/resolve-public-tenant-context";
import { PublicTenantReader, PublicTenantRecord } from "./application/ports/public-tenant-reader";

describe("Organization Module Public Boundaries", () => {
  it("exports server-safe capabilities via public.server", () => {
    expect(typeof orgServer.resolvePublicTenantContext).toBe("function");
  });

  it("does not leak Prisma internals or database client via public.server", () => {
    expect("prisma" in orgServer).toBe(false);
    expect("PrismaPublicTenantReader" in orgServer).toBe(false);
    expect("prismaPublicTenantReader" in orgServer).toBe(false);
    expect("db" in orgServer).toBe(false);
    expect("PrismaClient" in orgServer).toBe(false);
  });

  it("exports client-safe boundary via public.ts with zero runtime functions or server secrets", () => {
    // public.ts should only export types, so runtime object should be empty
    expect("resolvePublicTenantContext" in orgClient).toBe(false);
    expect("prisma" in orgClient).toBe(false);
    expect("DATABASE_URL" in orgClient).toBe(false);
  });
});

describe("PublicTenantContext Resolver (Unit / In-Memory)", () => {
  const mockDatabase: Record<string, { id: string; slug: string; name: string; isActive: boolean }> = {
    ama: {
      id: "e6759b00-099e-443a-8aa5-2bfc67b191ea",
      slug: "ama",
      name: "AMA Hospital",
      isActive: true,
    },
    inactive: {
      id: "12345678-1234-4234-a234-123456789012",
      slug: "inactive",
      name: "Inactive Hospital",
      isActive: false,
    },
  };

  const fakeReader: PublicTenantReader = {
    async findActiveBySlug(slug: string): Promise<PublicTenantRecord | null> {
      const record = mockDatabase[slug];
      if (!record || !record.isActive) {
        return null;
      }
      return {
        id: record.id,
        slug: record.slug,
        name: record.name,
      };
    },
  };

  const resolver = createPublicTenantResolver(fakeReader);

  it("resolves an active tenant successfully", async () => {
    const result = await resolver("ama");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        tenantId: "e6759b00-099e-443a-8aa5-2bfc67b191ea",
        slug: "ama",
        name: "AMA Hospital",
      });

      // Verify no persistence leakage: exact keys only
      expect(Object.keys(result.value)).toEqual(["tenantId", "slug", "name"]);
    }
  });

  it("yields TENANT_NOT_FOUND for a missing tenant", async () => {
    const result = await resolver("non-existent-tenant");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TENANT_NOT_FOUND");
    }
  });

  it("yields TENANT_NOT_FOUND for an inactive tenant (fail-closed, no existence leak)", async () => {
    const result = await resolver("inactive");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TENANT_NOT_FOUND");
    }
  });

  it("yields INVALID_TENANT_SLUG for an empty string slug", async () => {
    const result = await resolver("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TENANT_SLUG");
    }
  });

  it("yields INVALID_TENANT_SLUG for a whitespace-only slug", async () => {
    const result = await resolver("   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TENANT_SLUG");
    }
  });

  it("trims valid surrounding whitespace from slug", async () => {
    const result = await resolver("  ama  ");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slug).toBe("ama");
    }
  });
});
