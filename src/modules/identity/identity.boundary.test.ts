import { describe, it, expect } from "vitest";
import * as identityServer from "./public.server";
import * as identityClient from "./public";

describe("Identity Module Boundaries", () => {
  it("exports server-safe auth capabilities via public.server", () => {
    expect(identityServer.auth).toBeDefined();
    expect(typeof identityServer.getServerSession).toBe("function");
    expect(identityServer.AuthService).toBeDefined();
    expect(typeof identityServer.AuthService.getSession).toBe("function");
    expect(typeof identityServer.AuthService.requireSession).toBe("function");
    expect(typeof identityServer.requireAuth).toBe("function");
    expect(typeof identityServer.requireRole).toBe("function");
    expect(typeof identityServer.requirePermission).toBe("function");
  });

  it("does not leak Prisma internals or database client via public.server", () => {
    expect("prisma" in identityServer).toBe(false);
    expect("prismaAdapter" in identityServer).toBe(false);
    expect("db" in identityServer).toBe(false);
  });

  it("exports client-safe auth capabilities via public", () => {
    expect(identityClient.authClient).toBeDefined();
    expect(identityClient.AuthClient).toBeDefined();
    expect(typeof identityClient.AuthClient.useSession).toBe("function");
  });

  it("does not leak server secrets, auth config, or Prisma via public (client)", () => {
    expect("auth" in identityClient).toBe(false);
    expect("getServerSession" in identityClient).toBe(false);
    expect("AuthService" in identityClient).toBe(false);
    expect("prisma" in identityClient).toBe(false);
    expect("DATABASE_URL" in identityClient).toBe(false);
    expect("BETTER_AUTH_SECRET" in identityClient).toBe(false);
  });
});
