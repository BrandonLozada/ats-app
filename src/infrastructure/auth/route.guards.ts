// Compatibility bridge: canonical route guards relocated to Identity module
export {
  requireAuth,
  requireRole,
  requirePermission,
} from "@/modules/identity/public.server";
