import { redirect } from "next/navigation";
import { AuthService } from "./session.service";
import { AuthorizationService } from "@/application/auth/authorization.service";

export async function requireAuth() {
  const session = await AuthService.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role: string, tenantId?: string) {
  const session = await requireAuth();

  if (!tenantId) {
    console.warn("requireRole: no trusted tenant context provided; failing closed");
    redirect("/unauthorized");
  }

  const roles = await AuthorizationService.getUserRoles(session.user.id, tenantId);

  console.log("requireRole roles: ", roles);

  if (!roles.includes(role)) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requirePermission(permission: string, tenantId?: string) {
  const session = await requireAuth();

  if (!tenantId) {
    console.warn("requirePermission: no trusted tenant context provided; failing closed");
    redirect("/unauthorized");
  }

  const permissions = await AuthorizationService.getUserPermissions(
    session.user.id,
    tenantId,
  );

  if (!permissions.includes(permission)) {
    redirect("/unauthorized");
  }

  return session;
}
