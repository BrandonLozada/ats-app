import { redirect } from "next/navigation";

import { AuthService } from "./auth.service";
import { AuthorizationService } from "@/application/auth/authorization.service";

export async function requireAuth() {
  const session = await AuthService.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role: string) {
  const session = await requireAuth();

  const roles = await AuthorizationService.getUserRoles(session.user.id);

  console.log("requireRole roles: ", roles);

  if (!roles.includes(role)) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireAuth();

  const permissions = await AuthorizationService.getUserPermissions(
    session.user.id,
  );

  if (!permissions.includes(permission)) {
    redirect("/unauthorized");
  }

  return session;
}
