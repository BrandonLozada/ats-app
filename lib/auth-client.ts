import { createAuthClient } from "better-auth/react";
// import { twoFactorClient } from "better-auth/client/plugins";

// export const { signIn, signUp, useSession } = createAuthClient()
export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: "http://localhost:3000",
  appName: "My App", // provide your app name. It'll be used as an issuer.
  // plugins: [
  //   twoFactorClient({
  //     twoFactorPage: "/two-factor", // the page to redirect if a user needs to verify 2nd factor
  //   }),
  // ],
});
