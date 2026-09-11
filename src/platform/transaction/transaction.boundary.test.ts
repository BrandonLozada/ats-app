import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as clientExports from "./public";
import * as serverExports from "./public.server";
import type { TransactionContext } from "./public";
import { resolvePrismaClient } from "./prisma-transaction-client.server";

function getAllSourceTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      fullPath.endsWith(".ts") &&
      !fullPath.endsWith(".test.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Platform Transaction Boundary Tests", () => {
  const transactionDir = path.resolve(__dirname);
  const rootSrcDir = path.resolve(__dirname, "../..");
  const modulesDir = path.resolve(rootSrcDir, "modules");

  it("public.ts exports client-safe boundary with zero runtime values or server secrets", () => {
    const exportedKeys = Object.keys(clientExports);
    expect(exportedKeys).toEqual([]);
    expect("transactionPort" in clientExports).toBe(false);
    expect("prisma" in clientExports).toBe(false);
    expect("DATABASE_URL" in clientExports).toBe(false);
    expect("resolvePrismaClient" in clientExports).toBe(false);
    expect("PrismaTransactionAdapter" in clientExports).toBe(false);
    expect("registerTransactionClient" in clientExports).toBe(false);
    expect("unregisterTransactionClient" in clientExports).toBe(false);
  });

  it("public.ts contains zero Prisma or Next.js imports", () => {
    const publicTsPath = path.join(transactionDir, "public.ts");
    const content = fs.readFileSync(publicTsPath, "utf-8");
    expect(content).not.toContain("@prisma");
    expect(content).not.toContain("generated/prisma");
    expect(content).not.toContain("PrismaClient");
    expect(content).not.toContain("TransactionClient");
    expect(content).not.toContain("next");
  });

  it("transaction.port.ts contains zero Prisma imports or Prisma types", () => {
    const portPath = path.join(transactionDir, "transaction.port.ts");
    const content = fs.readFileSync(portPath, "utf-8");
    expect(content).not.toContain("@prisma");
    expect(content).not.toContain("generated/prisma");
    expect(content).not.toContain("PrismaClient");
    expect(content).not.toContain("TransactionClient");
    expect(content).not.toContain("PrismaPromise");
    expect(content).not.toContain("RawQuery");
    expect(content).not.toContain("Sql");
  });

  it("server infrastructure files enforce server-only", () => {
    const serverFiles = [
      "public.server.ts",
      "prisma-transaction.adapter.ts",
      "prisma-transaction-registry.server.ts",
      "prisma-transaction-client.server.ts",
    ];

    for (const file of serverFiles) {
      const fullPath = path.join(transactionDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toMatch(/^import\s+["']server-only["'];/);
    }
  });

  it("public.server.ts exports canonical transactionPort singleton and zero Prisma internals or registry functions", () => {
    expect(typeof serverExports.transactionPort).toBe("object");
    expect(typeof serverExports.transactionPort.run).toBe("function");

    // Must not leak Prisma internals or resolver or registry helpers through public.server
    expect("prisma" in serverExports).toBe(false);
    expect("PrismaClient" in serverExports).toBe(false);
    expect("resolvePrismaClient" in serverExports).toBe(false);
    expect("registerTransactionClient" in serverExports).toBe(false);
    expect("unregisterTransactionClient" in serverExports).toBe(false);
    expect("getTransactionClient" in serverExports).toBe(false);
    expect("activeTransactionClients" in serverExports).toBe(false);
  });

  it("platform/transaction files contain zero imports from business modules (recruiting, organization, identity)", () => {
    const transactionFiles = getAllSourceTsFiles(transactionDir);

    for (const file of transactionFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("modules/recruiting");
      expect(content).not.toContain("modules/organization");
      expect(content).not.toContain("modules/identity");
    }
  });

  it("business application and domain layers MUST NOT import transaction resolver, registry, or adapter", () => {
    if (!fs.existsSync(modulesDir)) return;

    const moduleFiles = getAllSourceTsFiles(modulesDir);
    const appAndDomainFiles = moduleFiles.filter(
      (f) => f.includes("/application/") || f.includes("\\application\\") ||
             f.includes("/domain/") || f.includes("\\domain\\")
    );

    for (const file of appAndDomainFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("prisma-transaction-client.server");
      expect(content).not.toContain("prisma-transaction-registry.server");
      expect(content).not.toContain("prisma-transaction.adapter");
    }
  });

  it("module infrastructure layers MUST NOT import transaction registry or adapter directly", () => {
    if (!fs.existsSync(modulesDir)) return;

    const moduleFiles = getAllSourceTsFiles(modulesDir);
    const infraFiles = moduleFiles.filter(
      (f) => f.includes("/infrastructure/") || f.includes("\\infrastructure\\")
    );

    for (const file of infraFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("prisma-transaction-registry.server");
      expect(content).not.toContain("prisma-transaction.adapter");
    }
  });

  it("all module public.ts files MUST NOT expose or import prisma-transaction-client.server", () => {
    if (!fs.existsSync(modulesDir)) return;

    const modulePublicFiles = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesDir, entry.name, "public.ts"))
      .filter((filePath) => fs.existsSync(filePath));

    for (const file of modulePublicFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("prisma-transaction-client.server");
      expect(content).not.toContain("resolvePrismaClient");
    }
  });

  it("TransactionPort does not expose generic UnitOfWork methods", () => {
    const portPath = path.join(transactionDir, "transaction.port.ts");
    const content = fs.readFileSync(portPath, "utf-8");

    // Generic Unit of Work methods are forbidden (Section 29)
    expect(content).not.toMatch(/\brepository\s*\(/);
    expect(content).not.toMatch(/\bquery\s*\(/);
    expect(content).not.toMatch(/\bexecute\s*\(/);
    expect(content).not.toMatch(/\bsave\s*\(/);
  });

  it("proves the canonical infrastructure repository pattern is architecture-valid and consumable", async () => {
    // Static & runtime consumability proof of the canonical repository pattern:
    // Future repository methods receive optional TransactionContext and resolve Prisma client.
    async function sampleRepositoryMethod(tx?: TransactionContext) {
      const db = resolvePrismaClient(tx);
      return db;
    }

    // Default outside transaction resolves root client
    const rootDb = await sampleRepositoryMethod(undefined);
    expect(rootDb).toBeDefined();
    expect(typeof rootDb).toBe("object");
  });
});
