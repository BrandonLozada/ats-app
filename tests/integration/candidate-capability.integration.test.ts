import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import {
  createCandidate,
  updateCandidate,
} from "@/modules/recruiting/public.server";
import { PrismaCandidateRepository } from "@/modules/recruiting/infrastructure/prisma-candidate-repository";
import { CandidateAlreadyClaimedException } from "@/modules/recruiting/application/candidate/ports/candidate-repository";
import type { AuthenticatedContext } from "@/modules/organization/public";

describe("Candidate Capability Integration Tests (Real PostgreSQL)", () => {
  const tenantAId = "96000000-0000-4000-e000-000000000001";
  const tenantBId = "96000000-0000-4000-e000-000000000002";

  const user1Id = "96000000-0000-4000-e000-000000000011";
  const user2Id = "96000000-0000-4000-e000-000000000012";

  const policyA1Id = "96000000-0000-4000-e000-000000000031";
  const policyA2Id = "96000000-0000-4000-e000-000000000032";
  const policyB1Id = "96000000-0000-4000-e000-000000000041";

  const ctxA: AuthenticatedContext = {
    tenant: {
      tenantId: tenantAId,
      slug: "tenant-a-96",
      name: "Tenant A 96",
    },
    actor: {
      userId: user1Id,
      email: "recruiter1@tenant-a-96.com",
      name: "Recruiter One 96",
    },
    membership: {
      membershipId: "96000000-0000-4000-e000-000000000021",
    },
    roles: ["Recruiter"],
    permissions: ["candidate.create", "candidate.update"],
  };

  const ctxB: AuthenticatedContext = {
    tenant: {
      tenantId: tenantBId,
      slug: "tenant-b-96",
      name: "Tenant B 96",
    },
    actor: {
      userId: user2Id,
      email: "recruiter2@tenant-b-96.com",
      name: "Recruiter Two 96",
    },
    membership: {
      membershipId: "96000000-0000-4000-e000-000000000022",
    },
    roles: ["Recruiter"],
    permissions: ["candidate.create", "candidate.update"],
  };

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
        { id: tenantAId, name: "Tenant A 96", slug: "tenant-a-96" },
        { id: tenantBId, name: "Tenant B 96", slug: "tenant-b-96" },
      ],
    });

    // 2. Users
    await prisma.user.createMany({
      data: [
        {
          id: user1Id,
          email: "user1@tenant-a-96.com",
          name: "User One 96",
          emailVerified: true,
        },
        {
          id: user2Id,
          email: "user2@tenant-b-96.com",
          name: "User Two 96",
          emailVerified: true,
        },
      ],
    });

    // 3. Privacy Policy Versions
    await prisma.privacyPolicyVersion.createMany({
      data: [
        {
          id: policyA1Id,
          tenantId: tenantAId,
          version: "1.0",
          content: "Policy 1.0 Tenant A",
          isActive: true,
          publishedAt: new Date(),
        },
        {
          id: policyA2Id,
          tenantId: tenantAId,
          version: "2.0",
          content: "Policy 2.0 Tenant A",
          isActive: false,
        },
        {
          id: policyB1Id,
          tenantId: tenantBId,
          version: "1.0",
          content: "Policy 1.0 Tenant B",
          isActive: true,
          publishedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("creates Candidate with DataProvenance in Tenant A", async () => {
    const result = await createCandidate(ctxA, {
      firstName: "Sofia",
      lastName: "Morales",
      email: "  Sofia.Morales@Hospital.COM  ",
      phone: "  +52 (55) 1234-5678  ",
      provenance: {
        source: "LinkedIn",
        channel: "Direct Message",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { candidate, provenance, privacyAcknowledgment, duplicates } =
        result.value;
      expect(candidate.tenantId).toBe(tenantAId);
      expect(candidate.firstName).toBe("Sofia");
      expect(candidate.lastName).toBe("Morales");
      expect(candidate.name).toBe("Sofia Morales");
      expect(candidate.email).toBe("Sofia.Morales@Hospital.COM");
      expect(candidate.emailNormalized).toBe("sofia.morales@hospital.com");
      expect(candidate.phone).toBe("+52 (55) 1234-5678");
      expect(candidate.phoneNormalized).toBe("525512345678");
      expect(candidate.createdById).toBe(user1Id);
      expect(duplicates).toEqual([]);
      expect(privacyAcknowledgment).toBeNull();

      expect(provenance).not.toBeNull();
      expect(provenance?.source).toBe("LinkedIn");
      expect(provenance?.channel).toBe("Direct Message");
      expect(provenance?.tenantId).toBe(tenantAId);
      expect(provenance?.candidateId).toBe(candidate.id);

      // Verify direct PostgreSQL persistence
      const dbCandidate = await prisma.candidate.findUnique({
        where: { id: candidate.id },
      });
      expect(dbCandidate).not.toBeNull();
      expect(dbCandidate?.emailNormalized).toBe("sofia.morales@hospital.com");

      const dbProvenance = await prisma.dataProvenance.findFirst({
        where: { candidateId: candidate.id },
      });
      expect(dbProvenance).not.toBeNull();
      expect(dbProvenance?.source).toBe("LinkedIn");
    }
  });

  it("enforces tenant isolation: Tenant B cannot read or update Tenant A Candidate", async () => {
    // Create candidate in Tenant A
    const created = await createCandidate(ctxA, {
      firstName: "IsolA",
      email: "isola@tenant-a.com",
      provenance: { source: "CareerPortal", channel: "Web" },
    });
    expect(created.ok).toBe(true);
    const candAId = (
      created as { value: { candidate: { id: string } } }
    ).value.candidate.id;

    // Tenant B attempt to update Tenant A candidate fails closed
    const updateResult = await updateCandidate(ctxB, {
      candidateId: candAId,
      firstName: "AttackerAttempt",
    });

    expect(updateResult.ok).toBe(false);
    if (!updateResult.ok) {
      expect(updateResult.error.code).toBe("CANDIDATE_NOT_FOUND");
    }

    // Verify candidate in DB remains untouched
    const dbCandidate = await prisma.candidate.findUnique({
      where: { id: candAId },
    });
    expect(dbCandidate?.firstName).toBe("IsolA");
  });

  it("allows same normalized email in same tenant with non-blocking duplicate signal (ADR-007)", async () => {
    // 1. Create first candidate
    const first = await createCandidate(ctxA, {
      firstName: "Mario",
      lastName: "Hernandez",
      email: "mario.duplicate@example.com",
      phone: "+1 555 111 2222",
      provenance: { source: "Web", channel: "Direct" },
    });
    expect(first.ok).toBe(true);

    // 2. Create second candidate in same tenant with same email (different casing/whitespace)
    const second = await createCandidate(ctxA, {
      firstName: "Mario Jr",
      lastName: "Hernandez",
      email: "  MARIO.DUPLICATE@example.COM  ",
      phone: "+1 555 111 2222",
      provenance: { source: "Agency", channel: "Referral" },
    });

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.candidate.id).not.toBe(
        (first as { value: { candidate: { id: string } } }).value.candidate.id
      );
      expect(second.value.duplicates.length).toBeGreaterThanOrEqual(1);
      const match = second.value.duplicates.find(
        (d) =>
          d.id ===
          (first as { value: { candidate: { id: string } } }).value.candidate.id
      );
      expect(match).toBeDefined();
      expect(match?.matchedOn).toContain("email");
      expect(match?.matchedOn).toContain("phone");
    }
  });

  it("allows same normalized email across tenants without cross-tenant duplicate leakage", async () => {
    const crossEmail = "cross.tenant@example.com";

    // Create in Tenant A
    const resA = await createCandidate(ctxA, {
      firstName: "TenantA User",
      email: crossEmail,
      provenance: { source: "Web", channel: "Direct" },
    });
    expect(resA.ok).toBe(true);

    // Create in Tenant B with identical email
    const resB = await createCandidate(ctxB, {
      firstName: "TenantB User",
      email: crossEmail,
      provenance: { source: "Web", channel: "Direct" },
    });

    expect(resB.ok).toBe(true);
    if (resB.ok) {
      expect(resB.value.candidate.tenantId).toBe(tenantBId);
      // Soft duplicate detection must NOT leak Tenant A candidate to Tenant B
      expect(resB.value.duplicates).toEqual([]);
    }
  });

  it("atomically creates Candidate with PrivacyAcknowledgment when valid policy is supplied", async () => {
    const result = await createCandidate(ctxA, {
      firstName: "Beatriz",
      email: "beatriz@example.com",
      provenance: { source: "Web", channel: "Direct" },
      privacyAcknowledgment: {
        policyVersionId: policyA1Id,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { candidate, privacyAcknowledgment } = result.value;
      expect(privacyAcknowledgment).not.toBeNull();
      expect(privacyAcknowledgment?.tenantId).toBe(tenantAId);
      expect(privacyAcknowledgment?.candidateId).toBe(candidate.id);
      expect(privacyAcknowledgment?.policyVersionId).toBe(policyA1Id);

      // Verify in PostgreSQL
      const dbAck = await prisma.privacyAcknowledgment.findFirst({
        where: { candidateId: candidate.id },
      });
      expect(dbAck).not.toBeNull();
      expect(dbAck?.policyVersionId).toBe(policyA1Id);
    }
  });

  it("rejects cross-tenant PrivacyPolicyVersion with PRIVACY_POLICY_VERSION_NOT_FOUND (atomic rollback)", async () => {
    const countBefore = await prisma.candidate.count({
      where: { tenantId: tenantAId },
    });

    // Attempt to acknowledge Tenant B's policy from Tenant A
    const result = await createCandidate(ctxA, {
      firstName: "HackerPolicy",
      email: "hackerpolicy@example.com",
      provenance: { source: "Web", channel: "Direct" },
      privacyAcknowledgment: {
        policyVersionId: policyB1Id,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_VERSION_NOT_FOUND");
    }

    // Verify atomic rollback: no Candidate row created
    const countAfter = await prisma.candidate.count({
      where: { tenantId: tenantAId },
    });
    expect(countAfter).toBe(countBefore);
  });

  it("rejects non-existent PrivacyPolicyVersion with PRIVACY_POLICY_VERSION_NOT_FOUND", async () => {
    const nonExistentPolicyId = "96000000-0000-4000-e000-000000000099";

    const result = await createCandidate(ctxA, {
      firstName: "GhostPolicy",
      email: "ghostpolicy@example.com",
      provenance: { source: "Web", channel: "Direct" },
      privacyAcknowledgment: {
        policyVersionId: nonExistentPolicyId,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRIVACY_POLICY_VERSION_NOT_FOUND");
    }
  });

  describe("authUserId account-claiming semantics", () => {
    it("allows candidate creation with optional authUserId", async () => {
      const result = await createCandidate(ctxA, {
        firstName: "Claimed1",
        email: "claimed1@example.com",
        authUserId: user1Id,
        provenance: { source: "Portal", channel: "AccountClaim" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.candidate.authUserId).toBe(user1Id);
      }
    });

    it("rejects second candidate with same authUserId in same tenant (mapped to CANDIDATE_ALREADY_CLAIMED_BY_USER)", async () => {
      const result = await createCandidate(ctxA, {
        firstName: "ClaimedDuplicate",
        email: "claimeddup@example.com",
        authUserId: user1Id,
        provenance: { source: "Portal", channel: "AccountClaim" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CANDIDATE_ALREADY_CLAIMED_BY_USER");
      }
    });

    it("allows same authUserId to claim a Candidate in a different Tenant (ADR-005)", async () => {
      const result = await createCandidate(ctxB, {
        firstName: "ClaimedInTenantB",
        email: "claimed.tenantb@example.com",
        authUserId: user1Id, // Same user claimed in Tenant A
        provenance: { source: "Portal", channel: "AccountClaim" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.candidate.tenantId).toBe(tenantBId);
        expect(result.value.candidate.authUserId).toBe(user1Id);
      }
    });

    it("rejects non-existent authUserId with AUTH_USER_NOT_FOUND", async () => {
      const ghostUserId = "96000000-0000-4000-e000-000000000098";
      const result = await createCandidate(ctxA, {
        firstName: "GhostUserClaim",
        email: "ghostuser@example.com",
        authUserId: ghostUserId,
        provenance: { source: "Portal", channel: "AccountClaim" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("AUTH_USER_NOT_FOUND");
      }
    });

    it("PrismaCandidateRepository discriminates between known auth claim P2002 and unknown P2002", async () => {
      const repo = new PrismaCandidateRepository();

      const knownP2002 = Object.assign(
        new Error(
          "Unique constraint failed on the fields: (`tenant_id`,`auth_user_id`)"
        ),
        {
          code: "P2002",
          meta: { target: ["tenant_id", "auth_user_id"] },
        }
      );

      const unknownP2002 = Object.assign(
        new Error(
          "Unique constraint failed on the fields: (`some_other_field`)"
        ),
        {
          code: "P2002",
          meta: { target: ["some_other_field"] },
        }
      );

      // 1. Simulate known P2002 -> CandidateAlreadyClaimedException
      const txSpyKnown = vi
        .spyOn(prisma, "$transaction")
        .mockRejectedValueOnce(knownP2002);

      await expect(
        repo.createCandidate({
          tenantId: tenantAId,
          authUserId: user1Id,
          name: "Known P2002",
          firstName: "Known",
          lastName: "P2002",
          email: "known.p2002@example.com",
          emailNormalized: "known.p2002@example.com",
          phone: null,
          phoneNormalized: null,
          status: "ACTIVE",
          cvUrl: null,
          cvRaw: null,
          createdById: user1Id,
          provenance: { source: "Web", channel: "Direct" },
          privacyAcknowledgment: null,
        })
      ).rejects.toThrow(CandidateAlreadyClaimedException);
      txSpyKnown.mockRestore();

      // 2. Simulate unknown P2002 -> rethrows raw error (does NOT map to CandidateAlreadyClaimedException)
      const txSpyUnknown = vi
        .spyOn(prisma, "$transaction")
        .mockRejectedValueOnce(unknownP2002);

      await expect(
        repo.createCandidate({
          tenantId: tenantAId,
          authUserId: user1Id,
          name: "Unknown P2002",
          firstName: "Unknown",
          lastName: "P2002",
          email: "unknown.p2002@example.com",
          emailNormalized: "unknown.p2002@example.com",
          phone: null,
          phoneNormalized: null,
          status: "ACTIVE",
          cvUrl: null,
          cvRaw: null,
          createdById: user1Id,
          provenance: { source: "Web", channel: "Direct" },
          privacyAcknowledgment: null,
        })
      ).rejects.toThrow(unknownP2002);
      txSpyUnknown.mockRestore();
    });
  });

  describe("updateCandidate and append-only preservation", () => {
    it("updates candidate fields with proper normalization and appends new provenance", async () => {
      // 1. Create candidate
      const created = await createCandidate(ctxA, {
        firstName: "OriginalFirst",
        lastName: "OriginalLast",
        email: "original.update@example.com",
        phone: "(555) 123-0000",
        provenance: { source: "InitialImport", channel: "Batch" },
      });
      expect(created.ok).toBe(true);
      const candId = (
        created as { value: { candidate: { id: string } } }
      ).value.candidate.id;

      // 2. Update candidate with changed email and phone
      const updated = await updateCandidate(ctxA, {
        candidateId: candId,
        firstName: "UpdatedFirst",
        email: "  UPDATED.EMAIL@Example.COM  ",
        phone: "+1 555-999-8888",
        provenance: { source: "RecruiterManual", channel: "PhoneCall" },
      });

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.candidate.firstName).toBe("UpdatedFirst");
        expect(updated.value.candidate.email).toBe(
          "UPDATED.EMAIL@Example.COM"
        );
        expect(updated.value.candidate.emailNormalized).toBe(
          "updated.email@example.com"
        );
        expect(updated.value.candidate.phoneNormalized).toBe("15559998888");
        expect(updated.value.provenance?.source).toBe("RecruiterManual");
      }

      // 3. Verify in PostgreSQL that multiple provenance events are preserved (append-only)
      const allProv = await prisma.dataProvenance.findMany({
        where: { candidateId: candId },
        orderBy: { collectedAt: "asc" },
      });
      expect(allProv.length).toBe(2);
      expect(allProv[0].source).toBe("InitialImport");
      expect(allProv[1].source).toBe("RecruiterManual");
    });

    it("appends new privacy acknowledgment without overwriting historical acknowledgment", async () => {
      // 1. Create candidate with policy A1
      const created = await createCandidate(ctxA, {
        firstName: "ConsentCandidate",
        email: "consent@example.com",
        provenance: { source: "Web", channel: "Direct" },
        privacyAcknowledgment: { policyVersionId: policyA1Id },
      });
      expect(created.ok).toBe(true);
      const candId = (
        created as { value: { candidate: { id: string } } }
      ).value.candidate.id;

      // 2. Append policy A2 on update
      const updated = await updateCandidate(ctxA, {
        candidateId: candId,
        privacyAcknowledgment: { policyVersionId: policyA2Id },
      });

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.privacyAcknowledgment?.policyVersionId).toBe(
          policyA2Id
        );
      }

      // 3. Verify in PostgreSQL that both acknowledgments are preserved in order
      const allAcks = await prisma.privacyAcknowledgment.findMany({
        where: { candidateId: candId },
        orderBy: { acknowledgedAt: "asc" },
      });
      expect(allAcks.length).toBe(2);
      expect(allAcks[0].policyVersionId).toBe(policyA1Id);
      expect(allAcks[1].policyVersionId).toBe(policyA2Id);
    });
  });

  describe("Transaction Atomicity", () => {
    it("deliberately forces a transaction failure on dependent insert and proves no partial persistence", async () => {
      const repo = new PrismaCandidateRepository();
      const nonExistentPolicyId = "96000000-0000-4000-e000-000000000077";
      const targetEmail = "atomicity.test@example.com";

      await expect(
        repo.createCandidate({
          tenantId: tenantAId,
          authUserId: null,
          name: "Atomicity Fail",
          firstName: "Atomicity",
          lastName: "Fail",
          email: targetEmail,
          emailNormalized: targetEmail,
          phone: null,
          phoneNormalized: null,
          status: "ACTIVE",
          cvUrl: null,
          cvRaw: null,
          createdById: user1Id,
          provenance: { source: "Web", channel: "Direct" },
          privacyAcknowledgment: { policyVersionId: nonExistentPolicyId },
        })
      ).rejects.toThrow();

      // Verify no candidate row exists for this email
      const dbCandidate = await prisma.candidate.findFirst({
        where: { tenantId: tenantAId, emailNormalized: targetEmail },
      });
      expect(dbCandidate).toBeNull();

      // Verify no orphan provenance was created
      const provForEmail = await prisma.$queryRaw<unknown[]>`
        SELECT p.id FROM data_provenance p
        JOIN candidates c ON c.id = p.candidate_id
        WHERE c.email_normalized = ${targetEmail}
      `;
      expect(provForEmail.length).toBe(0);
    });

    it("enforces tenant-scoped update where clause in PrismaCandidateRepository", async () => {
      const repo = new PrismaCandidateRepository();
      // 1. Create candidate in Tenant A
      const created = await repo.createCandidate({
        tenantId: tenantAId,
        authUserId: null,
        name: "Repo Scope Test",
        firstName: "RepoScope",
        lastName: "Test",
        email: "repo.scope@example.com",
        emailNormalized: "repo.scope@example.com",
        phone: null,
        phoneNormalized: null,
        status: "ACTIVE",
        cvUrl: null,
        cvRaw: null,
        createdById: user1Id,
        provenance: { source: "Web", channel: "Direct" },
        privacyAcknowledgment: null,
      });

      // 2. Direct repository call attempting to update Tenant A's candidate from Tenant B
      await expect(
        repo.updateCandidate({
          tenantId: tenantBId,
          candidateId: created.candidate.id,
          updatedById: user2Id,
          firstName: "MaliciousChange",
        })
      ).rejects.toThrow();

      // 3. Verify in DB that Tenant A's candidate was NOT changed
      const dbCand = await repo.findByIdInTenant(
        tenantAId,
        created.candidate.id
      );
      expect(dbCand?.firstName).toBe("RepoScope");
    });
  });
});
