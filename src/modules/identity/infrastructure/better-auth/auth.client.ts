import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// Client Side Better Auth Configuration
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        console.error("Too many requests. Please try again later.");
      }
    },
  },
});
