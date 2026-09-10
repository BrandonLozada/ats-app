import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type { PublicPrivacyPolicy } from "../../application/privacy-policy/privacy-policy-public.types";
import type { PrivacyPolicyResolutionError } from "../../application/privacy-policy/privacy-policy-public.errors";
import { Result, ok, err } from "@/platform/shared/result";

export type PrivacyPolicyRow = {
  id: string;
  version: string;
  content: string;
  publishedAt: Date | null;
};

export type PrivacyPolicyReadDbClient = {
  privacyPolicyVersion: {
    findMany: (args: {
      where: {
        tenantId: string;
        isActive: boolean;
      };
      select: {
        id: true;
        version: true;
        content: true;
        publishedAt: true;
      };
      take?: number;
    }) => Promise<PrivacyPolicyRow[]>;
  };
};

export async function resolveCurrentPrivacyPolicyQuery(
  tenantId: string,
  db: PrivacyPolicyReadDbClient = prisma
): Promise<Result<PublicPrivacyPolicy, PrivacyPolicyResolutionError>> {
  if (!tenantId || typeof tenantId !== "string" || tenantId.trim().length === 0) {
    return err({
      code: "PRIVACY_POLICY_NOT_FOUND",
      message: "Active privacy policy not found.",
    });
  }

  try {
    const rows = await db.privacyPolicyVersion.findMany({
      where: {
        tenantId: tenantId.trim(),
        isActive: true,
      },
      select: {
        id: true,
        version: true,
        content: true,
        publishedAt: true,
      },
      take: 3,
    });

    if (rows.length === 0) {
      return err({
        code: "PRIVACY_POLICY_NOT_FOUND",
        message: "Active privacy policy not found.",
      });
    }

    const publishedRows = rows.filter((r) => r.publishedAt !== null);

    if (publishedRows.length === 0) {
      return err({
        code: "PRIVACY_POLICY_NOT_FOUND",
        message: "Active privacy policy not found.",
      });
    }

    if (publishedRows.length > 1 || rows.length > 1) {
      return err({
        code: "PRIVACY_POLICY_CONFIGURATION_ERROR",
        message:
          "Invalid privacy policy configuration: multiple active policies detected.",
      });
    }

    const activePolicy = publishedRows[0];
    return ok({
      id: activePolicy.id,
      version: activePolicy.version,
      content: activePolicy.content,
      publishedAt: activePolicy.publishedAt as Date,
    });
  } catch {
    return err({
      code: "PRIVACY_POLICY_READ_ERROR",
      message: "Failed to resolve active privacy policy.",
    });
  }
}
