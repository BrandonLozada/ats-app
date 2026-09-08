import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";

describe("CandidateLead Deprecation & Architectural Regression Guard", () => {
  describe("PostgreSQL Persistence Invariants (Direct DB Inspection)", () => {
    it("confirms candidate_leads table contains exactly zero rows", async () => {
      const leadCount = await prisma.candidateLead.count();
      expect(leadCount).toBe(0);
    });

    it("confirms candidates table has no scalar foreign key columns to candidate_leads", async () => {
      const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'candidates'
          AND column_name ILIKE '%lead%';
      `;
      expect(cols).toHaveLength(0);
    });

    it("confirms no external tables reference candidate_leads via foreign keys", async () => {
      const incomingFks = await prisma.$queryRaw<Array<{ constraint_name: string; table_name: string }>>`
        SELECT
          tc.constraint_name,
          tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'candidate_leads';
      `;
      expect(incomingFks).toHaveLength(0);
    });
  });

  describe("Architectural Static Regression Guard (No Runtime CandidateLead Usage)", () => {
    const forbiddenPatterns = [
      /\bCandidateLead\b/,
      /\bcandidateLead\b/,
      /\bcandidate_lead\b/,
      /\bcandidate_leads\b/,
      /\bleadId\b/,
      /\blead_id\b/,
      /\bcandidateLeadId\b/,
      /\bcandidate_lead_id\b/,
      /\bLeadStatus\b/,
    ];

    function getSourceFiles(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Exclude generated artifacts
          if (entry.name !== "generated") {
            results.push(...getSourceFiles(fullPath));
          }
        } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it("ensures zero runtime TypeScript files in src/ reference CandidateLead or related symbols", () => {
      const srcDir = path.resolve(process.cwd(), "src");
      const files = getSourceFiles(srcDir);
      const violations: Array<{ file: string; line: number; match: string }> = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(lineText)) {
              violations.push({
                file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
                line: i + 1,
                match: lineText.trim(),
              });
              break;
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it("confirms candidate_leads table remains in schema for deferred Stage 9 drop (I6-S9-T02)", () => {
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

      expect(schemaContent).toContain("model CandidateLead {");
      expect(schemaContent).toContain('@@map("candidate_leads")');
    });
  });
});
