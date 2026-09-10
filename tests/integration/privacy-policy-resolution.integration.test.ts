import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { resolveCurrentPrivacyPolicy } from "@/modules/recruiting/public.server";
import { resolveCurrentPrivacyPolicyQuery } from "@/modules/recruiting/infrastructure/queries/prisma-privacy-policy-read";
import type { PublicTenantContext } from "@/modules/organization/public";

describe("Privacy Policy Resolution Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "97000000-0000-4000-f000-000000000001";
  const tenantBId = "97000000-0000-4000-f000-000000000002";
  const tenantCId = "97000000-0000-4000-f000-000000000003"; // Zero policies
  const tenantDId = "97000000-0000-4000-f000-000000000004"; // Inactive only
  const tenantEId = "97000000-0000-4000-f000-000000000005"; // Unpublished active only
  const tenantFId = "97000000-0000-4000-f000-000000000006"; // Multiple active published

  const policyA1Id = "97000000-0000-4000-f000-000000000011";
  const policyA2Id = "97000000-0000-4000-f000-000000000012";
  const policyB1Id = "97000000-0000-4000-f000-000000000021";
  const policyD1Id = "97000000-0000-4000-f000-000000000041";
  const policyE1Id = "97000000-0000-4000-f000-000000000051";
  const policyF1Id = "97000000-0000-4000-f000-000000000061";
  const policyF2Id = "97000000-0000-4000-f000-000000000062";

  const ctxA: PublicTenantContext = {
    tenantId: tenantAId,
    slug: "tenant-a-97",
    name: "Tenant A 97",
  };

  const ctxB: PublicTenantContext = {
    tenantId: tenantBId,
    slug: "tenant-b-97",
    name: "Tenant B 97",
  };

  const ctxC: PublicTenantContext = {
    tenantId: tenantCId,
    slug: "tenant-c-97",
    name: "Tenant C 97",
  };

  const ctxD: PublicTenantContext = {
    tenantId: tenantDId,
    slug: "tenant-d-97",
    name: "Tenant D 97",
  };

  const ctxE: PublicTenantContext = {
    tenantId: tenantEId,
    slug: "tenant-e-97",
    name: "Tenant E 97",
  };

  const ctxF: PublicTenantContext = {
    tenantId: tenantFId,
    slug: "tenant-f-97",
    name: "Tenant F 97",
  };

  const allTestTenantIds = [
    tenantAId,
    tenantBId,
    tenantCId,
    tenantDId,
    tenantEId,
    tenantFId,
  ];

  async function cleanup() {
    await prisma.privacyPolicyVersion.deleteMany({
      where: { tenantId: { in: allTestTenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: allTestTenantIds } },
    });
  }

  beforeAll(async () => {
    await cleanup();

    // Create test tenants
    for (const [id, slug, name] of [
      [tenantAId, "tenant-a-97", "Tenant A 97"],
      [tenantBId, "tenant-b-97", "Tenant B 97"],
      [tenantCId, "tenant-c-97", "Tenant C 97"],
      [tenantDId, "tenant-d-97", "Tenant D 97"],
      [tenantEId, "tenant-e-97", "Tenant E 97"],
      [tenantFId, "tenant-f-97", "Tenant F 97"],
    ]) {
      await prisma.tenant.create({
        data: { id, slug, name, isActive: true },
      });
    }

    // Tenant A: 1 active published policy + 1 inactive historical policy
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyA1Id,
        tenantId: tenantAId,
        version: "1.0.0",
        content: "Official Privacy Policy for Tenant A v1",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        isActive: true,
      },
    });
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyA2Id,
        tenantId: tenantAId,
        version: "0.9.0",
        content: "Historical Inactive Policy for Tenant A",
        publishedAt: new Date("2026-08-01T00:00:00.000Z"),
        isActive: false,
      },
    });

    // Tenant B: 1 active published policy
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyB1Id,
        tenantId: tenantBId,
        version: "2.1.0",
        content: "Official Privacy Policy for Tenant B v2.1",
        publishedAt: new Date("2026-09-05T00:00:00.000Z"),
        isActive: true,
      },
    });

    // Tenant C: 0 policies (intentionally left empty)

    // Tenant D: 1 inactive policy only
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyD1Id,
        tenantId: tenantDId,
        version: "1.0.0",
        content: "Only Inactive Policy for Tenant D",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        isActive: false,
      },
    });

    // Tenant E: 1 active but unpublished policy (publishedAt: null)
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyE1Id,
        tenantId: tenantEId,
        version: "1.0.0-draft",
        content: "Draft Active Policy for Tenant E",
        publishedAt: null,
        isActive: true,
      },
    });

    // Tenant F: multiple active published policies (configuration error)
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyF1Id,
        tenantId: tenantFId,
        version: "1.0.0",
        content: "Conflicting Active Policy 1 for Tenant F",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        isActive: true,
      },
    });
    await prisma.privacyPolicyVersion.create({
      data: {
        id: policyF2Id,
        tenantId: tenantFId,
        version: "2.0.0",
        content: "Conflicting Active Policy 2 for Tenant F",
        publishedAt: new Date("2026-09-02T00:00:00.000Z"),
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("Tenant A: resolves the single active published policy with strict client-safe projection", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxA);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(policyA1Id);
      expect(result.value.version).toBe("1.0.0");
      expect(result.value.content).toBe("Official Privacy Policy for Tenant A v1");
      expect(result.value.publishedAt).toEqual(new Date("2026-09-01T00:00:00.000Z"));

      // Security Invariant: projection excludes tenantId, isActive, createdAt, relations
      const keys = Object.keys(result.value).sort();
      expect(keys).toEqual(["content", "id", "publishedAt", "version"]);
      expect("tenantId" in result.value).toBe(false);
      expect("isActive" in result.value).toBe(false);
      expect("createdAt" in result.value).toBe(false);
    }
  });

  it("Tenant B: resolves its own distinct active published policy with full tenant isolation", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxB);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(policyB1Id);
      expect(result.value.version).toBe("2.1.0");
      expect(result.value.content).toBe("Official Privacy Policy for Tenant B v2.1");
    }
  });

  it("Cross-tenant isolation: Tenant B never receives Tenant A policy and vice versa", async () => {
    const resultB = await resolveCurrentPrivacyPolicy(ctxB);
    expect(resultB.ok).toBe(true);
    if (resultB.ok) {
      expect(resultB.value.id).not.toBe(policyA1Id);
      expect(resultB.value.id).not.toBe(policyA2Id);
    }

    const resultA = await resolveCurrentPrivacyPolicy(ctxA);
    expect(resultA.ok).toBe(true);
    if (resultA.ok) {
      expect(resultA.value.id).not.toBe(policyB1Id);
    }
  });

  it("Zero policy: returns PRIVACY_POLICY_NOT_FOUND when tenant has no policies", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxC);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
      expect(result.error.message).toBe("Active privacy policy not found.");
    }
  });

  it("Inactive policy only: returns PRIVACY_POLICY_NOT_FOUND when only inactive policies exist", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
      expect(result.error.message).toBe("Active privacy policy not found.");
    }
  });

  it("Unpublished active policy: fails closed with PRIVACY_POLICY_NOT_FOUND when publishedAt is null", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxE);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
      expect(result.error.message).toBe("Active privacy policy not found.");
    }
  });

  it("Multiple active published policies: fails closed with PRIVACY_POLICY_CONFIGURATION_ERROR", async () => {
    const result = await resolveCurrentPrivacyPolicy(ctxF);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_CONFIGURATION_ERROR");
      expect(result.error.message).toBe(
        "Invalid privacy policy configuration: multiple active policies detected."
      );
    }
  });

  it("Canonical AMA Tenant: resolves active seeded MVP privacy policy", async () => {
    const amaCtx: PublicTenantContext = {
      tenantId: "e6759b00-099e-443a-8aa5-2bfc67b191ea",
      slug: "ama",
      name: "AMA Hospital",
    };

    const result = await resolveCurrentPrivacyPolicy(amaCtx);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("e6759b00-0000-4000-a000-000000000001");
      expect(result.value.version).toBe("1.0.0");
      expect(result.value.content).toContain("MVP development privacy policy placeholder");
      expect(result.value.publishedAt).toBeInstanceOf(Date);
    }
  });

  it("Sanitizes database infrastructure errors and returns PRIVACY_POLICY_READ_ERROR", async () => {
    const brokenDb = {
      privacyPolicyVersion: {
        findMany: async (): Promise<never> => {
          throw new Error("FATAL 57P01: terminating connection due to administrator command");
        },
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantAId, brokenDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_READ_ERROR");
      expect(result.error.message).toBe("Failed to resolve active privacy policy.");
      expect(result.error.message).not.toContain("FATAL");
      expect(result.error.message).not.toContain("57P01");
    }
  });

  it("Verifies complete fixture cleanup leaving 0 residual rows in database", async () => {
    await cleanup();

    const residualTenants = await prisma.tenant.count({
      where: { id: { in: allTestTenantIds } },
    });
    const residualPolicies = await prisma.privacyPolicyVersion.count({
      where: { tenantId: { in: allTestTenantIds } },
    });

    expect(residualTenants).toBe(0);
    expect(residualPolicies).toBe(0);
  });
});
