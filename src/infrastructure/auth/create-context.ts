import { AuthService } from "./auth.service";
import { AuthorizationService } from "@/application/auth/authorization.service";
import type { AppContext } from "@/application/common/context";

export async function createAppContext(tenantId?: string): Promise<AppContext> {
  const session = await AuthService.requireSession();

  const userId = session.user.id;

  if (!tenantId) {
    // Fail closed: without trusted tenant context, do not evaluate or assign tenant-scoped roles/permissions
    return {
      userId,
      roles: [],
      permissions: [],
    };
  }

  const permissions = await AuthorizationService.getUserPermissions(userId, tenantId);

  const roles = await AuthorizationService.getUserRoles(userId, tenantId);

  return {
    userId,
    roles,
    permissions,
  };
}
