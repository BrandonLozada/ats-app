import { AppContext } from "../common/context";

export function requireAuth(ctx: AppContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
}

export function requireRole(ctx: AppContext, role: string) {
  if (!ctx.roles.includes(role)) {
    throw new Error("Forbidden");
  }
}

export function requirePermission(ctx: AppContext, permission: string) {
  if (!ctx.permissions.includes(permission)) {
    throw new Error("Forbidden");
  }
}
