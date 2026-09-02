export {
  resolveCurrentActor,
  type CurrentActor,
} from "./infrastructure/better-auth/current-actor.resolver";
export { auth, type Session } from "./infrastructure/better-auth/auth.config";
export {
  getServerSession,
  AuthService,
} from "./infrastructure/better-auth/session.service";
export {
  requireAuth,
  requireRole,
  requirePermission,
} from "./infrastructure/better-auth/route.guards";
