import type { AppContext } from "@/application/common/context";
// import { AppContext } from "next/app";

// TODO: Validar permisos específicos para cada acción, no solo roles, y este es de HTTP, para la API Routes.
export function requireRole(ctx: AppContext, role: string) {
  if (!ctx.roles.includes(role)) {
    throw new Error("Forbidden");
  }
}
