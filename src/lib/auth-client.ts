import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
// import { toast } from "sonner";

// Client Side
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        // toast.error("Too many requests. Please try again later.");
        console.error("Too many requests. Please try again later.");
      }
    },
  },
});
