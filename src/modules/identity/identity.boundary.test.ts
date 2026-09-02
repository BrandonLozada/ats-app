import { describe, it, expect } from "vitest";
import * as identityServer from "./public.server";
import * as identityClient from "./public";
import { mapToCurrentActor } from "./application/current-actor";

describe("Identity Module Boundaries", () => {
  it("exports server-safe auth capabilities via public.server", () => {
    expect(identityServer.auth).toBeDefined();
    expect(typeof identityServer.getServerSession).toBe("function");
    expect(typeof identityServer.resolveCurrentActor).toBe("function");
    // Verify trust boundary: resolveCurrentActor takes zero arguments (no caller session injection)
    expect(identityServer.resolveCurrentActor.length).toBe(0);
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
    expect("resolveCurrentActor" in identityClient).toBe(false);
    expect("AuthService" in identityClient).toBe(false);
    expect("prisma" in identityClient).toBe(false);
    expect("DATABASE_URL" in identityClient).toBe(false);
    expect("BETTER_AUTH_SECRET" in identityClient).toBe(false);
  });
});

describe("CurrentActor Pure Mapping", () => {
  it("maps an authenticated session correctly to CurrentActor", () => {
    const mockSession = {
      user: {
        id: "usr_123e4567-e89b-12d3-a456-426614174000",
        email: "doctor@example.com",
        name: "Dr. Gregory House",
        emailVerified: true,
        image: "https://example.com/avatar.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        // Vendor/extraneous fields:
        vendorSessionToken: "token_abc123",
      },
      session: {
        id: "sess_xyz789",
        token: "tok_123",
        userId: "usr_123e4567-e89b-12d3-a456-426614174000",
      },
    };

    const actor = mapToCurrentActor(mockSession);

    expect(actor).toEqual({
      userId: "usr_123e4567-e89b-12d3-a456-426614174000",
      email: "doctor@example.com",
      name: "Dr. Gregory House",
    });

    // Explicitly verify no vendor or speculative fields leaked
    expect(Object.keys(actor!)).toEqual(["userId", "email", "name"]);
  });

  it("returns null when session is null (anonymous)", () => {
    const actor = mapToCurrentActor(null);
    expect(actor).toBeNull();
  });

  it("returns null when session has no user property", () => {
    const actor = mapToCurrentActor({ user: null });
    expect(actor).toBeNull();
  });

  it("returns null when session object is undefined", () => {
    const actor = mapToCurrentActor(undefined);
    expect(actor).toBeNull();
  });
});
