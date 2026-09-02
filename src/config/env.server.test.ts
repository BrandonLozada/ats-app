import { describe, it, expect, vi } from "vitest";
import { parseEnv } from "./env.schema";

describe("env validation", () => {
  it("succeeds with valid DATABASE_URL and NODE_ENV", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgresql://user:password@localhost:5432/ats_db",
      NODE_ENV: "production",
    });

    expect(parsed.DATABASE_URL).toBe(
      "postgresql://user:password@localhost:5432/ats_db"
    );
    expect(parsed.NODE_ENV).toBe("production");
  });

  it("defaults NODE_ENV to development if omitted", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgresql://user:password@localhost:5432/ats_db",
    });

    expect(parsed.NODE_ENV).toBe("development");
  });

  it("fails when DATABASE_URL is missing or empty", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
      })
    ).toThrowError(/DATABASE_URL/);

    expect(() =>
      parseEnv({
        DATABASE_URL: "",
        NODE_ENV: "development",
      })
    ).toThrowError(/DATABASE_URL/);
  });

  it("fails when NODE_ENV is invalid", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://user:password@localhost:5432/ats_db",
        NODE_ENV: "staging" as unknown as "development",
      })
    ).toThrowError(/Invalid server environment configuration/);
  });

  it("loads env.server successfully when valid environment variables are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("NODE_ENV", "test");

    const { env } = await import("./env.server");
    expect(env).toBeDefined();
    expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(env.NODE_ENV).toBe("test");

    vi.unstubAllEnvs();
  });
});
