import { Result, ok, err } from "@/platform/shared/result";
import { PublicTenantContext } from "./public-tenant-context";
import { PublicTenantReader } from "./ports/public-tenant-reader";

export type PublicTenantResolutionError =
  | {
      readonly code: "TENANT_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_TENANT_SLUG";
      readonly message: string;
    };

/**
 * Creates a resolvePublicTenantContext resolver backed by the provided reader.
 * Pure application logic without Prisma or framework dependencies.
 */
export function createPublicTenantResolver(reader: PublicTenantReader) {
  return async function resolvePublicTenantContext(
    tenantSlug: string
  ): Promise<Result<PublicTenantContext, PublicTenantResolutionError>> {
    if (typeof tenantSlug !== "string") {
      return err({
        code: "INVALID_TENANT_SLUG",
        message: "Tenant slug must be a string.",
      });
    }

    const normalizedSlug = tenantSlug.trim();
    if (!normalizedSlug) {
      return err({
        code: "INVALID_TENANT_SLUG",
        message: "Tenant slug must not be empty.",
      });
    }

    const tenant = await reader.findActiveBySlug(normalizedSlug);
    if (!tenant) {
      return err({
        code: "TENANT_NOT_FOUND",
        message: `Tenant '${normalizedSlug}' not found or inactive.`,
      });
    }

    const context: PublicTenantContext = {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    };

    return ok(context);
  };
}
