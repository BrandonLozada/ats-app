import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as recruitingServer from "./public.server";
import * as recruitingClient from "./public";

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

describe("Recruiting Module Public Boundaries", () => {
  it("exports server capabilities via public.server", () => {
    expect(typeof recruitingServer.createPipeline).toBe("function");
    expect(typeof recruitingServer.createPipelineVersion).toBe("function");
    expect(typeof recruitingServer.updateDraftPipelineVersion).toBe("function");
    expect(typeof recruitingServer.publishPipelineVersion).toBe("function");
    expect(typeof recruitingServer.resolvePipelineVersion).toBe("function");
    expect(typeof recruitingServer.createVacancy).toBe("function");
    expect(typeof recruitingServer.publishVacancy).toBe("function");
    expect(typeof recruitingServer.findPublishedVacancies).toBe("function");
    expect(typeof recruitingServer.getPublicVacancyDetails).toBe("function");
    expect(typeof recruitingServer.createCandidate).toBe("function");
    expect(typeof recruitingServer.updateCandidate).toBe("function");
  });

  it("does not export PipelineAuthContext from public or public.server", () => {
    expect("PipelineAuthContext" in recruitingClient).toBe(false);
    expect("PipelineAuthContext" in recruitingServer).toBe(false);
  });

  it("does not leak Prisma internals, database client, or query adapter via public.server", () => {
    expect("prisma" in recruitingServer).toBe(false);
    expect("PrismaPipelineRepository" in recruitingServer).toBe(false);
    expect("prismaPipelineRepository" in recruitingServer).toBe(false);
    expect("PrismaVacancyRepository" in recruitingServer).toBe(false);
    expect("prismaVacancyRepository" in recruitingServer).toBe(false);
    expect("PrismaCandidateRepository" in recruitingServer).toBe(false);
    expect("prismaCandidateRepository" in recruitingServer).toBe(false);
    expect("findPublishedVacanciesQuery" in recruitingServer).toBe(false);
    expect("getPublicVacancyDetailsQuery" in recruitingServer).toBe(false);
    expect("db" in recruitingServer).toBe(false);
    expect("PrismaClient" in recruitingServer).toBe(false);
  });

  it("exports client-safe boundary via public.ts with zero runtime functions or server secrets", () => {
    expect("createPipeline" in recruitingClient).toBe(false);
    expect("createVacancy" in recruitingClient).toBe(false);
    expect("publishVacancy" in recruitingClient).toBe(false);
    expect("findPublishedVacancies" in recruitingClient).toBe(false);
    expect("getPublicVacancyDetails" in recruitingClient).toBe(false);
    expect("createCandidate" in recruitingClient).toBe(false);
    expect("updateCandidate" in recruitingClient).toBe(false);
    expect("findPublishedVacanciesQuery" in recruitingClient).toBe(false);
    expect("getPublicVacancyDetailsQuery" in recruitingClient).toBe(false);
    expect("prisma" in recruitingClient).toBe(false);
    expect("DATABASE_URL" in recruitingClient).toBe(false);
  });

  it("infrastructure query adapter enforces server-only", () => {
    const queryFile = path.resolve(
      __dirname,
      "infrastructure/queries/prisma-vacancy-public-read.ts"
    );
    const content = fs.readFileSync(queryFile, "utf-8");
    expect(content).toMatch(/^import\s+["']server-only["'];/);
  });
});

describe("Recruiting Module Architectural Boundaries", () => {
  const recruitingDir = path.resolve(__dirname);
  const organizationDir = path.resolve(__dirname, "../organization");
  const recruitingFiles = getAllSourceTsFiles(recruitingDir);
  const organizationFiles = getAllSourceTsFiles(organizationDir);

  it("recruiting imports Organization strictly through public.ts", () => {
    for (const file of recruitingFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const orgImports = [
        ...content.matchAll(/from\s+["']([^"']*organization[^"']*)["']/g),
      ].map((m) => m[1]);

      for (const importPath of orgImports) {
        expect(importPath).toMatch(/^@\/modules\/organization\/public$/);
        expect(importPath).not.toContain("infrastructure");
        expect(importPath).not.toContain("application");
        expect(importPath).not.toContain("composition");
      }
    }
  });

  it("recruiting imports no Organization infrastructure", () => {
    for (const file of recruitingFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("modules/organization/infrastructure");
    }
  });

  it("recruiting imports no Identity infrastructure", () => {
    for (const file of recruitingFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("modules/identity/infrastructure");
    }
  });

  it("does not create circular module dependency (organization does not import recruiting)", () => {
    for (const file of organizationFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("modules/recruiting");
    }
  });

  it("recruiting application layer contains zero @prisma/client imports", () => {
    const appDir = path.join(recruitingDir, "application");
    const appFiles = getAllSourceTsFiles(appDir);
    for (const file of appFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("@prisma/client");
    }
  });

  it("ensures no VacancyPublicReadRepositoryPort remains in application layer (ADR-020)", () => {
    const appDir = path.join(recruitingDir, "application");
    const appFiles = getAllSourceTsFiles(appDir);
    for (const file of appFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("VacancyPublicReadRepositoryPort");
    }
  });
});


