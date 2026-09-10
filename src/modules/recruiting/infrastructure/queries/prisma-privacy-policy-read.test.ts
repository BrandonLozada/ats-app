import { describe, it, expect, vi } from "vitest";
import {
  resolveCurrentPrivacyPolicyQuery,
  type PrivacyPolicyReadDbClient,
} from "./prisma-privacy-policy-read";
import { resolveCurrentPrivacyPolicy } from "../../composition.server";
import type { PublicTenantContext } from "@/modules/organization/public";

describe("Privacy Policy Resolution Read Capability (ADR-020)", () => {
  const tenantId = "e6759b00-099e-443a-8aa5-2bfc67b191ea";

  it("resolves successfully when exactly one active published policy exists", async () => {
    const publishedAt = new Date("2026-09-01T00:00:00.000Z");
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "policy-1",
            version: "1.0.0",
            content: "Official Privacy Policy Content",
            publishedAt,
          },
        ]),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: "policy-1",
        version: "1.0.0",
        content: "Official Privacy Policy Content",
        publishedAt,
      });
      // Invariant: client-safe DTO excludes internal fields
      expect(result.value).not.toHaveProperty("tenantId");
      expect(result.value).not.toHaveProperty("isActive");
      expect(result.value).not.toHaveProperty("createdAt");
    }
  });

  it("fails with PRIVACY_POLICY_NOT_FOUND when zero policies exist", async () => {
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
      expect(result.error.message).toBe("Active privacy policy not found.");
    }
  });

  it("fails with PRIVACY_POLICY_NOT_FOUND when active policy is unpublished (publishedAt is null)", async () => {
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "policy-draft",
            version: "0.1.0",
            content: "Draft Policy",
            publishedAt: null,
          },
        ]),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
      expect(result.error.message).toBe("Active privacy policy not found.");
    }
  });

  it("fails with PRIVACY_POLICY_CONFIGURATION_ERROR when multiple active published policies exist", async () => {
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "policy-1",
            version: "1.0.0",
            content: "Policy v1",
            publishedAt: new Date("2026-09-01T00:00:00.000Z"),
          },
          {
            id: "policy-2",
            version: "2.0.0",
            content: "Policy v2",
            publishedAt: new Date("2026-09-05T00:00:00.000Z"),
          },
        ]),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_CONFIGURATION_ERROR");
      expect(result.error.message).toBe(
        "Invalid privacy policy configuration: multiple active policies detected."
      );
    }
  });

  it("fails with PRIVACY_POLICY_CONFIGURATION_ERROR when multiple active policies exist even if one is unpublished", async () => {
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "policy-1",
            version: "1.0.0",
            content: "Policy v1",
            publishedAt: new Date("2026-09-01T00:00:00.000Z"),
          },
          {
            id: "policy-2",
            version: "2.0.0-draft",
            content: "Policy v2 draft",
            publishedAt: null,
          },
        ]),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_CONFIGURATION_ERROR");
    }
  });

  it("sanitizes infrastructure errors and never leaks Prisma or database details", async () => {
    const sensitiveError = new Error(
      "PrismaClientKnownRequestError: Connection failed at postgresql://secret_user:super_secret_password@127.0.0.1:5432/ats_db_dev"
    );
    const mockDb: PrivacyPolicyReadDbClient = {
      privacyPolicyVersion: {
        findMany: vi.fn().mockRejectedValue(sensitiveError),
      },
    };

    const result = await resolveCurrentPrivacyPolicyQuery(tenantId, mockDb);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_READ_ERROR");
      expect(result.error.message).toBe("Failed to resolve active privacy policy.");
      // Invariant: no leaking of connection credentials, table names, or error messages
      expect(result.error.message).not.toContain("secret_user");
      expect(result.error.message).not.toContain("super_secret_password");
      expect(result.error.message).not.toContain("PrismaClientKnownRequestError");
      expect(result.error.message).not.toContain("postgresql://");
    }
  });

  it("resolveCurrentPrivacyPolicy enforces PublicTenantContext authority and fails closed on invalid context", async () => {
    const emptyCtx = { tenantId: "", slug: "empty", name: "Empty" } as PublicTenantContext;
    const result1 = await resolveCurrentPrivacyPolicy(emptyCtx);
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
    }

    const nullCtx = null as unknown as PublicTenantContext;
    const result2 = await resolveCurrentPrivacyPolicy(nullCtx);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.code).toBe("PRIVACY_POLICY_NOT_FOUND");
    }
  });
});
