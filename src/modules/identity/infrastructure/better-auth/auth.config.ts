import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/infrastructure/database/prisma.client";

// Server Better Auth Configuration
export const auth = betterAuth({
  appName: "ATS Empleo",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      generateId: (options) => {
        // Let database auto-generate for specific models
        if (options.model === "user" || options.model === "users") {
          return false; // Let database generate ID
        }
        // Generate UUIDs for other tables
        return crypto.randomUUID();
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // defaults to true
    requireEmailVerification: false,
  },
  magicLink: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!, // clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  account: {
    accountLinking: {
      trustedProviders: ["email-password", "google"],
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url, metadata }, ctx) => {
        // send email to user
      },
    }),
    nextCookies(), // make sure this is the last plugin in the array
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});

export type Session = typeof auth.$Infer.Session;
