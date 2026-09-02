import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const PRINCIPAL_MODULES = ["identity", "organization", "recruiting"];

function buildCrossModulePatterns(currentModule) {
  const otherModules = PRINCIPAL_MODULES.filter((m) => m !== currentModule);
  const patterns = [];
  
  otherModules.forEach((m) => {
    patterns.push({
      group: [`@/modules/${m}/domain/**`, `../${m}/domain/**`, `../../${m}/domain/**`, `../../../${m}/domain/**`],
      message: `Cross-module domain imports are forbidden. Consume ${m} via public.ts or public.server.ts instead.`
    });
    patterns.push({
      group: [`@/modules/${m}/application/**`, `../${m}/application/**`, `../../${m}/application/**`, `../../../${m}/application/**`],
      message: `Cross-module application imports are forbidden. Consume ${m} via public.ts or public.server.ts instead.`
    });
    patterns.push({
      group: [`@/modules/${m}/infrastructure/**`, `../${m}/infrastructure/**`, `../../${m}/infrastructure/**`, `../../../${m}/infrastructure/**`],
      message: `Cross-module infrastructure imports are forbidden.`
    });
    patterns.push({
      group: [`@/modules/${m}/composition.server`, `../${m}/composition.server`, `../../${m}/composition.server`, `../../../${m}/composition.server`, `@/modules/${m}/composition.server.ts`],
      message: `Cross-module composition imports are forbidden.`
    });
  });
  
  return patterns;
}

const domainBasePatterns = [
  { group: ["next/*", "next"], message: "Domain layer must be framework independent." },
  { group: ["@prisma/*", "prisma"], message: "Domain layer must be ORM independent." },
  { group: ["better-auth/*"], message: "Domain layer must be Auth framework independent." },
  { group: ["@/modules/*/infrastructure/**", "**/infrastructure/**"], message: "Domain layer cannot depend on infrastructure." },
  { group: ["@/platform/*/infrastructure/**"], message: "Domain layer cannot depend on platform infrastructure." }
];

const applicationBasePatterns = [
  { group: ["next/*", "next"], message: "Application layer must not depend on Next.js delivery APIs." },
  { group: ["@prisma/*", "prisma"], message: "Application layer must be ORM independent." },
  { group: ["@/modules/*/infrastructure/**", "**/infrastructure/**"], message: "Application layer cannot depend on infrastructure." }
];

const moduleConfigs = PRINCIPAL_MODULES.flatMap((mod) => [
  {
    files: [`src/modules/${mod}/domain/**`],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [...domainBasePatterns, ...buildCrossModulePatterns(mod)]
      }]
    }
  },
  {
    files: [`src/modules/${mod}/application/**`],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [...applicationBasePatterns, ...buildCrossModulePatterns(mod)]
      }]
    }
  },
  {
    files: [`src/modules/${mod}/**`],
    ignores: [`src/modules/${mod}/domain/**`, `src/modules/${mod}/application/**`],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: buildCrossModulePatterns(mod)
      }]
    }
  }
]);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...moduleConfigs,
  {
    files: ["src/app/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/modules/*/infrastructure/**", "../**/modules/*/infrastructure/**"], message: "App Router must not import module infrastructure directly." },
          { group: ["@/modules/*/domain/**", "../**/modules/*/domain/**"], message: "App Router must not import module domain directly. Use public.ts." }
        ]
      }]
    }
  }
]);

export default eslintConfig;
