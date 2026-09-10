export type PrivacyPolicyFixture = {
  readonly id: string;
  readonly version: string;
  readonly content: string;
  readonly publishedAt: Date;
  readonly isActive: boolean;
};

export const CANONICAL_AMA_PRIVACY_POLICY_FIXTURE: PrivacyPolicyFixture = {
  id: "e6759b00-0000-4000-a000-000000000001",
  version: "1.0.0",
  content:
    "MVP development privacy policy placeholder. Replace with approved legal policy before production.",
  publishedAt: new Date("2026-09-01T00:00:00.000Z"),
  isActive: true,
};

export type ExistingPolicySummary = {
  id: string;
  version: string;
  isActive: boolean;
  publishedAt: Date | null;
  content: string;
};

export type PrivacyPolicySeedDecision =
  | {
      action: "CREATE";
      data: PrivacyPolicyFixture;
    }
  | {
      action: "PRESERVE";
      reason: string;
    };

export function decidePrivacyPolicySeedAction(
  existingPolicies: ReadonlyArray<ExistingPolicySummary>,
  fixture: PrivacyPolicyFixture = CANONICAL_AMA_PRIVACY_POLICY_FIXTURE
): PrivacyPolicySeedDecision {
  const activePolicies = existingPolicies.filter((p) => p.isActive);
  if (activePolicies.length > 1) {
    throw new Error(
      `Seed configuration error: multiple active privacy policy versions detected for tenant (found: ${activePolicies
        .map((p) => p.version)
        .join(", ")}). Seed cannot safely proceed without administrative intervention.`
    );
  }

  const v1 = existingPolicies.find((p) => p.version === fixture.version);
  if (v1) {
    if (v1.id !== fixture.id) {
      throw new Error(
        `Seed configuration error: privacy policy version ${fixture.version} already exists with unexpected id "${v1.id}" (expected "${fixture.id}"). Seed will not overwrite foreign records.`
      );
    }
    return {
      action: "PRESERVE",
      reason: `Canonical bootstrap privacy policy version ${fixture.version} already exists (${v1.isActive ? "active" : "inactive"}). Preserving existing lifecycle state.`,
    };
  }

  if (existingPolicies.length > 0) {
    return {
      action: "PRESERVE",
      reason: `Tenant already has ${existingPolicies.length} policy version(s) configured. Preserving existing lifecycle state without injecting bootstrap fixture.`,
    };
  }

  return {
    action: "CREATE",
    data: fixture,
  };
}

export type PrivacyPolicySeedDbClient = {
  privacyPolicyVersion: {
    findMany: (args: {
      where: { tenantId: string };
      select: {
        id: true;
        version: true;
        isActive: true;
        publishedAt: true;
        content: true;
      };
    }) => Promise<ExistingPolicySummary[]>;
    create: (args: {
      data: {
        id: string;
        tenantId: string;
        version: string;
        content: string;
        publishedAt: Date;
        isActive: boolean;
      };
    }) => Promise<{ version: string; id: string; isActive: boolean }>;
  };
};

export async function seedAmaPrivacyPolicy(
  db: PrivacyPolicySeedDbClient,
  tenantId: string,
  fixture: PrivacyPolicyFixture = CANONICAL_AMA_PRIVACY_POLICY_FIXTURE
): Promise<{ status: "CREATED" | "PRESERVED"; version: string; message: string }> {
  const existingPolicies = await db.privacyPolicyVersion.findMany({
    where: { tenantId },
    select: {
      id: true,
      version: true,
      isActive: true,
      publishedAt: true,
      content: true,
    },
  });

  const decision = decidePrivacyPolicySeedAction(existingPolicies, fixture);

  if (decision.action === "CREATE") {
    const created = await db.privacyPolicyVersion.create({
      data: {
        id: decision.data.id,
        tenantId,
        version: decision.data.version,
        content: decision.data.content,
        publishedAt: decision.data.publishedAt,
        isActive: decision.data.isActive,
      },
    });
    return {
      status: "CREATED",
      version: created.version,
      message: `Created canonical bootstrap privacy policy version ${created.version} (${created.id})`,
    };
  }

  return {
    status: "PRESERVED",
    version: fixture.version,
    message: decision.reason,
  };
}
