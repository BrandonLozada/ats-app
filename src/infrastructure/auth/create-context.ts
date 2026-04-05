import { AuthService } from "./auth.service";
import { AuthorizationService } from "@/application/auth/authorization.service";
import type { AppContext } from "@/application/common/context";

export async function createAppContext(): Promise<AppContext> {
  const session = await AuthService.requireSession();

  const userId = session.user.id;

  const permissions = await AuthorizationService.getUserPermissions(userId);

  const roles = await AuthorizationService.getUserRoles(userId);

  return {
    userId,
    roles,
    permissions,
  };
}
