import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  decidePrivacyPolicySeedAction,
  seedAmaPrivacyPolicy,
  CANONICAL_AMA_PRIVACY_POLICY_FIXTURE,
} from "../../prisma/privacy-policy-seed";

describe("Privacy Policy Seed Lifecycle Safety (Pure Decision Logic)", () => {
  const customFixture = {
    id: "97000000-0000-4000-f000-000000000001",
    version: "1.0.0",
    content: "Bootstrap Content",
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    isActive: true,
  };

  it("decides CREATE on fresh state (0 policies)", () => {
    const decision = decidePrivacyPolicySeedAction([], customFixture);
    expect(decision.action).toBe("CREATE");
    if (decision.action === "CREATE") {
      expect(decision.data.id).toBe(customFixture.id);
      expect(decision.data.version).toBe(customFixture.version);
      expect(decision.data.isActive).toBe(true);
    }
  });

  it("decides PRESERVE on rerun when same v1 active policy already exists", () => {
    const decision = decidePrivacyPolicySeedAction(
      [
        {
          id: customFixture.id,
          version: customFixture.version,
          content: customFixture.content,
          publishedAt: customFixture.publishedAt,
          isActive: true,
        },
      ],
      customFixture
    );
    expect(decision.action).toBe("PRESERVE");
  });

  it("decides PRESERVE when v1 is inactive and v2 is active (never reactivates obsolete versions)", () => {
    const decision = decidePrivacyPolicySeedAction(
      [
        {
          id: customFixture.id,
          version: "1.0.0",
          content: "Old v1",
          publishedAt: new Date("2026-08-01T00:00:00.000Z"),
          isActive: false,
        },
        {
          id: "97000000-0000-4000-f000-000000000002",
          version: "2.0.0",
          content: "New v2",
          publishedAt: new Date("2026-09-01T00:00:00.000Z"),
          isActive: true,
        },
      ],
      customFixture
    );
    expect(decision.action).toBe("PRESERVE");
  });

  it("fails closed when existing configuration has multiple active policies", () => {
    expect(() =>
      decidePrivacyPolicySeedAction(
        [
          {
            id: customFixture.id,
            version: "1.0.0",
            content: "v1",
            publishedAt: new Date("2026-08-01T00:00:00.000Z"),
            isActive: true,
          },
          {
            id: "97000000-0000-4000-f000-000000000002",
            version: "2.0.0",
            content: "v2",
            publishedAt: new Date("2026-09-01T00:00:00.000Z"),
            isActive: true,
          },
        ],
        customFixture
      )
    ).toThrow(/multiple active privacy policy versions detected/);
  });

  it("fails closed when version 1.0.0 exists with an unexpected ID", () => {
    expect(() =>
      decidePrivacyPolicySeedAction(
        [
          {
            id: "foreign-id-not-matching-fixture",
            version: "1.0.0",
            content: "Foreign content",
            publishedAt: new Date("2026-08-01T00:00:00.000Z"),
            isActive: true,
          },
        ],
        customFixture
      )
    ).toThrow(/unexpected id "foreign-id-not-matching-fixture"/);
  });
});

describe("Privacy Policy Seed Lifecycle Safety (Real PostgreSQL)", () => {
  const seedTestTenantId = "97000000-0000-4000-f000-000000000099";
  const fixturePolicyId = "97000000-0000-4000-f000-000000000091";

  const testFixture = {
    id: fixturePolicyId,
    version: "1.0.0",
    content: "Lifecycle Test Fixture Content",
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    isActive: true,
  };

  async function cleanup() {
    await prisma.privacyPolicyVersion.deleteMany({
      where: { tenantId: seedTestTenantId },
    });
    await prisma.tenant.deleteMany({
      where: { id: seedTestTenantId },
    });
  }

  beforeAll(async () => {
    await cleanup();
    await prisma.tenant.create({
      data: {
        id: seedTestTenantId,
        slug: "tenant-seed-lifecycle-97",
        name: "Seed Lifecycle Test Tenant",
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("Case A: creates deterministic v1 active policy on fresh tenant", async () => {
    const result = await seedAmaPrivacyPolicy(
      prisma,
      seedTestTenantId,
      testFixture
    );

    expect(result.status).toBe("CREATED");
    expect(result.version).toBe("1.0.0");

    const inDb = await prisma.privacyPolicyVersion.findUnique({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
    });

    expect(inDb).not.toBeNull();
    expect(inDb?.id).toBe(fixturePolicyId);
    expect(inDb?.isActive).toBe(true);
    expect(inDb?.content).toBe(testFixture.content);
    expect(inDb?.publishedAt).toEqual(testFixture.publishedAt);
  });

  it("Case B: repeated seed is a non-destructive no-op and preserves active v1 unchanged", async () => {
    const initial = await prisma.privacyPolicyVersion.findUniqueOrThrow({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
    });

    const result = await seedAmaPrivacyPolicy(
      prisma,
      seedTestTenantId,
      testFixture
    );

    expect(result.status).toBe("PRESERVED");

    const afterRerun = await prisma.privacyPolicyVersion.findUniqueOrThrow({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
    });

    expect(afterRerun.id).toBe(initial.id);
    expect(afterRerun.isActive).toBe(true);
    expect(afterRerun.createdAt).toEqual(initial.createdAt);
    expect(afterRerun.content).toBe(initial.content);
    expect(afterRerun.publishedAt).toEqual(initial.publishedAt);
  });

  it("Case C: preserves v1 inactive when v2 is active (never reactivates obsolete v1)", async () => {
    // Administratively transition v1 to inactive and create v2 active
    await prisma.privacyPolicyVersion.update({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
      data: {
        isActive: false,
      },
    });

    const v2PolicyId = "97000000-0000-4000-f000-000000000092";
    await prisma.privacyPolicyVersion.create({
      data: {
        id: v2PolicyId,
        tenantId: seedTestTenantId,
        version: "2.0.0",
        content: "Legal Policy Version 2",
        publishedAt: new Date("2026-09-08T00:00:00.000Z"),
        isActive: true,
      },
    });

    // Rerun seed
    const result = await seedAmaPrivacyPolicy(
      prisma,
      seedTestTenantId,
      testFixture
    );

    expect(result.status).toBe("PRESERVED");

    // Invariant: v1 must remain inactive!
    const v1 = await prisma.privacyPolicyVersion.findUniqueOrThrow({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
    });
    expect(v1.isActive).toBe(false);

    // Invariant: v2 must remain active!
    const v2 = await prisma.privacyPolicyVersion.findUniqueOrThrow({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "2.0.0",
        },
      },
    });
    expect(v2.isActive).toBe(true);

    // Invariant: exactly 1 active policy exists for tenant
    const activeCount = await prisma.privacyPolicyVersion.count({
      where: {
        tenantId: seedTestTenantId,
        isActive: true,
      },
    });
    expect(activeCount).toBe(1);
  });

  it("Case D: fails closed if invalid multiple active policies exist", async () => {
    // Manually create an invalid multi-active state
    await prisma.privacyPolicyVersion.update({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
      data: {
        isActive: true, // Now both v1 and v2 are active
      },
    });

    await expect(
      seedAmaPrivacyPolicy(prisma, seedTestTenantId, testFixture)
    ).rejects.toThrow(/multiple active privacy policy versions detected/);

    // Restore valid state
    await prisma.privacyPolicyVersion.update({
      where: {
        tenantId_version: {
          tenantId: seedTestTenantId,
          version: "1.0.0",
        },
      },
      data: {
        isActive: false,
      },
    });
  });

  it("Case E: fails closed if version 1.0.0 exists with unexpected ID (foreign record)", async () => {
    const foreignTenantId = "97000000-0000-4000-f000-000000000098";
    await prisma.tenant.create({
      data: {
        id: foreignTenantId,
        slug: "foreign-tenant-97",
        name: "Foreign Tenant",
        isActive: true,
      },
    });

    await prisma.privacyPolicyVersion.create({
      data: {
        id: "97000000-0000-4000-f000-000000000088", // Unexpected ID
        tenantId: foreignTenantId,
        version: "1.0.0",
        content: "Foreign content",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        isActive: true,
      },
    });

    await expect(
      seedAmaPrivacyPolicy(prisma, foreignTenantId, testFixture)
    ).rejects.toThrow(/unexpected id "97000000-0000-4000-f000-000000000088"/);

    // Cleanup foreign tenant
    await prisma.privacyPolicyVersion.deleteMany({
      where: { tenantId: foreignTenantId },
    });
    await prisma.tenant.deleteMany({
      where: { id: foreignTenantId },
    });
  });

  it("verifies canonical AMA tenant fixture has expected ID and version in development DB", async () => {
    const amaTenant = await prisma.tenant.findUnique({
      where: { slug: "ama" },
    });
    expect(amaTenant).not.toBeNull();

    if (amaTenant) {
      const amaPolicy = await prisma.privacyPolicyVersion.findUnique({
        where: {
          tenantId_version: {
            tenantId: amaTenant.id,
            version: "1.0.0",
          },
        },
      });
      expect(amaPolicy).not.toBeNull();
      expect(amaPolicy?.id).toBe(CANONICAL_AMA_PRIVACY_POLICY_FIXTURE.id);
      expect(amaPolicy?.version).toBe(CANONICAL_AMA_PRIVACY_POLICY_FIXTURE.version);
      expect(amaPolicy?.isActive).toBe(true);
    }
  });

  it("verifies clean fixture teardown with 0 residual test rows", async () => {
    await cleanup();

    const residualTenants = await prisma.tenant.count({
      where: { id: seedTestTenantId },
    });
    const residualPolicies = await prisma.privacyPolicyVersion.count({
      where: { tenantId: seedTestTenantId },
    });

    expect(residualTenants).toBe(0);
    expect(residualPolicies).toBe(0);
  });
});
