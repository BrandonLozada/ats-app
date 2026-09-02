import { authClient } from "./infrastructure/better-auth/auth.client";

export { authClient };

export const AuthClient = {
  useSession: authClient.useSession,
};
