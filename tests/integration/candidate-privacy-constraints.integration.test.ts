import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { Prisma } from "@/generated/prisma/client";
import { candidateService } from "@/application/services/candidate.service";
import { CandidateService } from "@/core/candidate/candidate.service";
import { CandidateRepository } from "@/core/candidate/candidate.repository";

describe("Candidate & Privacy Constraints Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "95000000-0000-4000-e000-000000000001";
  const tenantBId = "95000000-0000-4000-e000-000000000002";

  const user1Id = "95000000-0000-4000-e000-000000000011";
  const user2Id = "95000000-0000-4000-e000-000000000012";

  async function cleanup() {
    await prisma.privacyAcknowledgment.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.privacyPolicyVersion.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.dataProvenance.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.candidate.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
  }

  beforeAll(async () => {
    await cleanup();

    // 1. Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, slug: "tenant-cand-a", name: "Tenant Candidate A" },
        { id: tenantBId, slug: "tenant-cand-b", name: "Tenant Candidate B" },
      ],
    });

    // 2. Users
    await prisma.user.createMany({
      data: [
        { id: user1Id, email: "user1.candidate@example.com", name: "User 1" },
        { id: user2Id, email: "user2.candidate@example.com", name: "User 2" },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe("Candidate Identity & Email Constraints", () => {
    it("allows two distinct Candidates with the exact same email in the same tenant (no uniqueness)", async () => {
      const email = "shared.applicant@example.com";
      const emailNorm = "shared.applicant@example.com";

      const cand1 = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Applicant One",
          firstName: "Applicant",
          lastName: "One",
          email,
          emailNormalized: emailNorm,
        },
      });

      const cand2 = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Applicant Two",
          firstName: "Applicant",
          lastName: "Two",
          email,
          emailNormalized: emailNorm,
        },
      });

      expect(cand1.id).toBeDefined();
      expect(cand2.id).toBeDefined();
      expect(cand1.id).not.toBe(cand2.id);
      expect(cand1.email).toBe(cand2.email);

      // Verify both queryable under tenant
      const found = await prisma.candidate.findMany({
        where: { tenantId: tenantAId, emailNormalized: emailNorm },
      });
      expect(found).toHaveLength(2);
    });

    it("allows Candidates with the same email across different tenants", async () => {
      const email = "cross.tenant@example.com";
      const emailNorm = "cross.tenant@example.com";

      const candA = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Applicant A",
          firstName: "Applicant",
          lastName: "A",
          email,
          emailNormalized: emailNorm,
        },
      });

      const candB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "Applicant B",
          firstName: "Applicant",
          lastName: "B",
          email,
          emailNormalized: emailNorm,
        },
      });

      expect(candA.tenantId).toBe(tenantAId);
      expect(candB.tenantId).toBe(tenantBId);
      expect(candA.email).toBe(candB.email);
    });
  });

  describe("Candidate Account Claiming & authUserId Foreign Key", () => {
    it("allows Guest Candidate with authUserId = null", async () => {
      const guest = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Guest Candidate",
          firstName: "Guest",
          lastName: "Candidate",
          email: "guest@example.com",
          emailNormalized: "guest@example.com",
          authUserId: null,
        },
      });

      expect(guest.authUserId).toBeNull();
    });

    it("allows Candidate with valid authUserId", async () => {
      const claimed = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Claimed Candidate",
          firstName: "Claimed",
          lastName: "Candidate",
          email: "claimed@example.com",
          emailNormalized: "claimed@example.com",
          authUserId: user1Id,
        },
      });

      expect(claimed.authUserId).toBe(user1Id);
    });

    it("rejects Candidate with non-existent authUserId (FK constraint)", async () => {
      const nonExistentUserId = "95000000-0000-4000-e000-999999999999";

      await expect(
        prisma.candidate.create({
          data: {
            tenantId: tenantAId,
            name: "Invalid User Candidate",
            firstName: "Invalid",
            lastName: "Candidate",
            email: "invalid.user@example.com",
            emailNormalized: "invalid.user@example.com",
            authUserId: nonExistentUserId,
          },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it("allows the same User to claim a Candidate in different tenants (ADR-005)", async () => {
      const candInTenantB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "User 1 in Tenant B",
          firstName: "User1",
          lastName: "TenantB",
          email: "user1.tenantb@example.com",
          emailNormalized: "user1.tenantb@example.com",
          authUserId: user1Id,
        },
      });

      expect(candInTenantB.tenantId).toBe(tenantBId);
      expect(candInTenantB.authUserId).toBe(user1Id);
    });

    it("rejects claiming a second Candidate for the same User in the same tenant (@@unique([tenantId, authUserId]))", async () => {
      await expect(
        prisma.candidate.create({
          data: {
            tenantId: tenantAId,
            name: "Duplicate User Claim in Tenant A",
            firstName: "Duplicate",
            lastName: "Claim",
            email: "user1.duplicate@example.com",
            emailNormalized: "user1.duplicate@example.com",
            authUserId: user1Id, // user1Id already claimed a candidate in tenantAId
          },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe("DataProvenance Constraints & Tenant Safety", () => {
    it("allows multiple DataProvenance rows per Candidate", async () => {
      const cand = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Provenance Candidate",
          firstName: "Provenance",
          lastName: "Candidate",
          email: "provenance.test@example.com",
          emailNormalized: "provenance.test@example.com",
        },
      });

      const prov1 = await prisma.dataProvenance.create({
        data: {
          tenantId: tenantAId,
          candidateId: cand.id,
          source: "WEB_FORM",
          channel: "CAREERS_PAGE",
        },
      });

      const prov2 = await prisma.dataProvenance.create({
        data: {
          tenantId: tenantAId,
          candidateId: cand.id,
          source: "RECRUITER_MANUAL",
          channel: "LINKEDIN",
        },
      });

      expect(prov1.id).toBeDefined();
      expect(prov2.id).toBeDefined();

      const events = await prisma.dataProvenance.findMany({
        where: { tenantId: tenantAId, candidateId: cand.id },
      });
      expect(events).toHaveLength(2);
    });

    it("rejects DataProvenance cross-tenant Candidate linkage (compound FK constraint)", async () => {
      // Candidate is in Tenant B
      const candInB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "Tenant B Candidate",
          firstName: "Tenant",
          lastName: "B",
          email: "tenantb.cand@example.com",
          emailNormalized: "tenantb.cand@example.com",
        },
      });

      // Attempt to link DataProvenance under Tenant A to Candidate in Tenant B
      await expect(
        prisma.dataProvenance.create({
          data: {
            tenantId: tenantAId,
            candidateId: candInB.id,
            source: "WEB_FORM",
            channel: "CAREERS_PAGE",
          },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe("PrivacyPolicyVersion & PrivacyAcknowledgment History & Safety", () => {
    it("supports historical policy versions (v1 and v2) and exact acknowledgment pinning", async () => {
      // 1. Create Policy v1
      const policyV1 = await prisma.privacyPolicyVersion.create({
        data: {
          tenantId: tenantAId,
          version: "v1.0",
          content: "Privacy Notice Version 1.0 Content",
          publishedAt: new Date("2026-01-01T00:00:00Z"),
          isActive: false,
        },
      });

      // 2. Candidate acknowledges Policy v1
      const cand = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Privacy Candidate",
          firstName: "Privacy",
          lastName: "Candidate",
          email: "privacy.applicant@example.com",
          emailNormalized: "privacy.applicant@example.com",
        },
      });

      const ackV1 = await prisma.privacyAcknowledgment.create({
        data: {
          tenantId: tenantAId,
          candidateId: cand.id,
          policyVersionId: policyV1.id,
        },
      });

      expect(ackV1.policyVersionId).toBe(policyV1.id);

      // 3. Create Policy v2
      const policyV2 = await prisma.privacyPolicyVersion.create({
        data: {
          tenantId: tenantAId,
          version: "v2.0",
          content: "Privacy Notice Version 2.0 Updated Content",
          publishedAt: new Date("2026-06-01T00:00:00Z"),
          isActive: true,
        },
      });

      // 4. Candidate acknowledgment remains linked to v1
      const foundAck = await prisma.privacyAcknowledgment.findUnique({
        where: { id: ackV1.id },
      });
      expect(foundAck?.policyVersionId).toBe(policyV1.id);

      // 5. Candidate later acknowledges v2: both rows are preserved
      const ackV2 = await prisma.privacyAcknowledgment.create({
        data: {
          tenantId: tenantAId,
          candidateId: cand.id,
          policyVersionId: policyV2.id,
        },
      });
      expect(ackV2.id).toBeDefined();

      const candAcks = await prisma.privacyAcknowledgment.findMany({
        where: { candidateId: cand.id },
        orderBy: { acknowledgedAt: "asc" },
      });

      expect(candAcks).toHaveLength(2);
      expect(candAcks[0]?.policyVersionId).toBe(policyV1.id);
      expect(candAcks[1]?.policyVersionId).toBe(policyV2.id);
    });

    it("rejects deleting a PrivacyPolicyVersion that has existing acknowledgments (onDelete: Restrict)", async () => {
      const policy = await prisma.privacyPolicyVersion.create({
        data: {
          tenantId: tenantAId,
          version: "v-restrict",
          content: "Policy to test restrict",
          isActive: true,
        },
      });

      const cand = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Candidate Restrict",
          firstName: "Candidate",
          lastName: "Restrict",
          email: "restrict@example.com",
          emailNormalized: "restrict@example.com",
        },
      });

      await prisma.privacyAcknowledgment.create({
        data: {
          tenantId: tenantAId,
          candidateId: cand.id,
          policyVersionId: policy.id,
        },
      });

      // Attempt deletion of acknowledged policy version -> Must fail with Restrict
      await expect(
        prisma.privacyPolicyVersion.delete({
          where: { id: policy.id },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it("rejects PrivacyAcknowledgment cross-tenant Candidate linkage (compound FK constraint)", async () => {
      const policyA = await prisma.privacyPolicyVersion.create({
        data: {
          tenantId: tenantAId,
          version: "v-cross-cand",
          content: "Policy in Tenant A",
        },
      });

      const candB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "Candidate in Tenant B",
          firstName: "B",
          lastName: "Cand",
          email: "b.cand@example.com",
          emailNormalized: "b.cand@example.com",
        },
      });

      // Attempt acknowledgment with tenant A and Candidate in tenant B
      await expect(
        prisma.privacyAcknowledgment.create({
          data: {
            tenantId: tenantAId,
            candidateId: candB.id,
            policyVersionId: policyA.id,
          },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it("rejects PrivacyAcknowledgment cross-tenant Policy linkage (compound FK constraint)", async () => {
      const policyB = await prisma.privacyPolicyVersion.create({
        data: {
          tenantId: tenantBId,
          version: "v-cross-policy",
          content: "Policy in Tenant B",
        },
      });

      const candA = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Candidate in Tenant A",
          firstName: "A",
          lastName: "Cand",
          email: "a.cand@example.com",
          emailNormalized: "a.cand@example.com",
        },
      });

      // Attempt acknowledgment with tenant A and Policy in tenant B
      await expect(
        prisma.privacyAcknowledgment.create({
          data: {
            tenantId: tenantAId,
            candidateId: candA.id,
            policyVersionId: policyB.id,
          },
        })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe("Migration 0006 Semantics & Safety Invariants", () => {
    const migrationSqlPath = path.resolve(
      process.cwd(),
      "prisma/migrations/0006_candidate_privacy_foundation/migration.sql"
    );
    const sql = fs.readFileSync(migrationSqlPath, "utf-8");

    it("migration 0006 contains RENAME user_id to auth_user_id (value-preserving)", () => {
      expect(sql).toContain('ALTER TABLE "candidates" RENAME COLUMN "user_id" TO "auth_user_id";');
    });

    it("migration 0006 does NOT DROP user_id", () => {
      expect(sql).not.toContain('DROP COLUMN "user_id"');
    });

    it("migration 0006 contains fail-closed Candidate-row precondition guard", () => {
      expect(sql).toContain("I6-S5-T01 BLOCKED: Candidate rows exist");
    });

    it("verifies tenant-leading indexes in schema and migration", () => {
      // DataProvenance: tenant-leading only
      expect(sql).toContain('CREATE INDEX "data_provenance_tenant_id_candidate_id_idx"');
      expect(sql).not.toContain('CREATE INDEX "data_provenance_candidate_id_idx"');

      // PrivacyAcknowledgment: tenant-leading only
      expect(sql).toContain('CREATE INDEX "privacy_acknowledgments_tenant_id_candidate_id_idx"');
      expect(sql).toContain('CREATE INDEX "privacy_acknowledgments_tenant_id_policy_version_id_idx"');
      expect(sql).not.toContain('CREATE INDEX "privacy_acknowledgments_candidate_id_idx"');
      expect(sql).not.toContain('CREATE INDEX "privacy_acknowledgments_policy_version_id_idx"');
    });
  });

  describe("Legacy Compatibility & Fail-Closed Scoping", () => {
    it("candidateService.getByUserId requires non-empty tenant and fails closed", async () => {
      await expect(candidateService.getByUserId("", user1Id)).rejects.toThrow(
        "tenantId is required and cannot be empty"
      );
    });

    it("same authUserId across Tenant A and Tenant B never resolves cross-tenant", async () => {
      // Create user2 claimed candidate in Tenant A
      const candA = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "User 2 in A",
          firstName: "User2",
          lastName: "TenantA",
          email: "user2.a@example.com",
          emailNormalized: "user2.a@example.com",
          authUserId: user2Id,
        },
      });

      // Create user2 claimed candidate in Tenant B
      const candB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "User 2 in B",
          firstName: "User2",
          lastName: "TenantB",
          email: "user2.b@example.com",
          emailNormalized: "user2.b@example.com",
          authUserId: user2Id,
        },
      });

      // Queried under Tenant A -> returns candA, never candB
      const resultA = await candidateService.getByUserId(tenantAId, user2Id);
      expect(resultA?.id).toBe(candA.id);
      expect(resultA?.tenantId).toBe(tenantAId);

      // Queried under Tenant B -> returns candB, never candA
      const resultB = await candidateService.getByUserId(tenantBId, user2Id);
      expect(resultB?.id).toBe(candB.id);
      expect(resultB?.tenantId).toBe(tenantBId);
    });

    it("CandidateService.create fails closed without tenant or email (no fallback to empty string)", async () => {
      await expect(
        CandidateService.create({
          name: "No Tenant",
          firstName: "No",
          email: "notenant@example.com",
        })
      ).rejects.toThrow("tenantId is required and cannot be empty");

      await expect(
        CandidateService.create({
          name: "No Email",
          firstName: "No",
          tenantId: tenantAId,
        } as unknown as Parameters<typeof CandidateService.create>[0])
      ).rejects.toThrow("email is required and cannot be empty");
    });

    it("CandidateRepository.findByEmail is tenant-scoped and fails closed without tenant", async () => {
      await expect(CandidateRepository.findByEmail("", "test@example.com")).rejects.toThrow(
        "tenantId is required"
      );

      const email = "scoped.lookup@example.com";
      const candInA = await prisma.candidate.create({
        data: {
          tenantId: tenantAId,
          name: "Lookup A",
          firstName: "Lookup",
          lastName: "A",
          email,
          emailNormalized: email,
        },
      });

      const candInB = await prisma.candidate.create({
        data: {
          tenantId: tenantBId,
          name: "Lookup B",
          firstName: "Lookup",
          lastName: "B",
          email,
          emailNormalized: email,
        },
      });

      const foundA = await CandidateRepository.findByEmail(tenantAId, email);
      expect(foundA?.id).toBe(candInA.id);
      expect(foundA?.tenantId).toBe(tenantAId);

      const foundB = await CandidateRepository.findByEmail(tenantBId, email);
      expect(foundB?.id).toBe(candInB.id);
      expect(foundB?.tenantId).toBe(tenantBId);
    });
  });
});
