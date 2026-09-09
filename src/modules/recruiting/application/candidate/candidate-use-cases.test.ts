import { describe, it, expect, beforeEach } from "vitest";
import type { AuthenticatedContext } from "@/modules/organization/public";
import { createCandidateUseCase } from "./create-candidate";
import { updateCandidateUseCase } from "./update-candidate";
import {
  CandidateRepositoryPort,
  CreateCandidateData,
  UpdateCandidateData,
  FindSoftDuplicatesCriteria,
  CandidateNotFoundException,
  CandidateAlreadyClaimedException,
  AuthUserNotFoundException,
  PrivacyPolicyVersionNotFoundException,
} from "./ports/candidate-repository";
import type {
  CandidateRecord,
  CandidateDuplicateMatch,
  DataProvenanceRecord,
  PrivacyAcknowledgmentRecord,
} from "./candidate.types";

class InMemoryCandidateRepository implements CandidateRepositoryPort {
  public candidates: CandidateRecord[] = [];
  public provenances: DataProvenanceRecord[] = [];
  public privacyAcks: PrivacyAcknowledgmentRecord[] = [];
  public users: { id: string }[] = [];
  public policies: { id: string; tenantId: string }[] = [];

  async findByIdInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateRecord | null> {
    const found = this.candidates.find(
      (c) => c.tenantId === tenantId && c.id === candidateId && !c.deletedAt
    );
    return found ? { ...found } : null;
  }

  async findByAuthUserIdInTenant(
    tenantId: string,
    authUserId: string
  ): Promise<CandidateRecord | null> {
    const found = this.candidates.find(
      (c) => c.tenantId === tenantId && c.authUserId === authUserId && !c.deletedAt
    );
    return found ? { ...found } : null;
  }

  async findSoftDuplicates(
    tenantId: string,
    criteria: FindSoftDuplicatesCriteria
  ): Promise<readonly CandidateDuplicateMatch[]> {
    const matches: CandidateDuplicateMatch[] = [];

    for (const c of this.candidates) {
      if (c.tenantId !== tenantId || c.deletedAt) continue;
      if (criteria.excludeCandidateId && c.id === criteria.excludeCandidateId) {
        continue;
      }

      const matchedOn: ("email" | "phone")[] = [];
      if (c.emailNormalized === criteria.emailNormalized) {
        matchedOn.push("email");
      }
      if (
        criteria.phoneNormalized &&
        c.phoneNormalized === criteria.phoneNormalized
      ) {
        matchedOn.push("phone");
      }

      if (matchedOn.length > 0) {
        matches.push({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          matchedOn,
          createdAt: c.createdAt,
        });
      }
    }

    return matches;
  }

  async createCandidate(data: CreateCandidateData): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }> {
    if (data.authUserId) {
      const userExists = this.users.some((u) => u.id === data.authUserId);
      if (!userExists) {
        throw new AuthUserNotFoundException(
          `User "${data.authUserId}" not found.`
        );
      }

      const existingClaim = this.candidates.find(
        (c) =>
          c.tenantId === data.tenantId &&
          c.authUserId === data.authUserId &&
          !c.deletedAt
      );
      if (existingClaim) {
        throw new CandidateAlreadyClaimedException(
          `User "${data.authUserId}" already claimed in tenant "${data.tenantId}".`
        );
      }
    }

    if (data.privacyAcknowledgment) {
      const policyExists = this.policies.some(
        (p) =>
          p.tenantId === data.tenantId &&
          p.id === data.privacyAcknowledgment?.policyVersionId
      );
      if (!policyExists) {
        throw new PrivacyPolicyVersionNotFoundException(
          `Policy version "${data.privacyAcknowledgment.policyVersionId}" not found in tenant "${data.tenantId}".`
        );
      }
    }

    const candidateId = `cand-${this.candidates.length + 1}`;
    const now = new Date();

    const candidate: CandidateRecord = {
      id: candidateId,
      tenantId: data.tenantId,
      authUserId: data.authUserId,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      emailNormalized: data.emailNormalized,
      phone: data.phone,
      phoneNormalized: data.phoneNormalized,
      status: data.status,
      cvUrl: data.cvUrl,
      cvRaw: data.cvRaw,
      cvParsedData: null,
      cvParsedAt: null,
      dataCompleteness: 0,
      deletedAt: null,
      createdById: data.createdById,
      createdAt: now,
      updatedById: null,
      updatedAt: now,
    };
    this.candidates.push(candidate);

    const provenance: DataProvenanceRecord = {
      id: `prov-${this.provenances.length + 1}`,
      tenantId: data.tenantId,
      candidateId: candidate.id,
      source: data.provenance.source,
      channel: data.provenance.channel,
      collectedAt: now,
    };
    this.provenances.push(provenance);

    let ack: PrivacyAcknowledgmentRecord | null = null;
    if (data.privacyAcknowledgment) {
      ack = {
        id: `ack-${this.privacyAcks.length + 1}`,
        tenantId: data.tenantId,
        candidateId: candidate.id,
        policyVersionId: data.privacyAcknowledgment.policyVersionId,
        acknowledgedAt: now,
      };
      this.privacyAcks.push(ack);
    }

    return { candidate, provenance, privacyAcknowledgment: ack };
  }

  async updateCandidate(data: UpdateCandidateData): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord | null;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }> {
    const existing = this.candidates.find(
      (c) => c.tenantId === data.tenantId && c.id === data.candidateId && !c.deletedAt
    );
    if (!existing) {
      throw new CandidateNotFoundException(
        `Candidate "${data.candidateId}" not found in tenant.`
      );
    }

    if (data.authUserId !== undefined && data.authUserId !== null) {
      if (data.authUserId !== existing.authUserId) {
        const userExists = this.users.some((u) => u.id === data.authUserId);
        if (!userExists) {
          throw new AuthUserNotFoundException(
            `User "${data.authUserId}" not found.`
          );
        }

        const existingClaim = this.candidates.find(
          (c) =>
            c.tenantId === data.tenantId &&
            c.authUserId === data.authUserId &&
            c.id !== data.candidateId &&
            !c.deletedAt
        );
        if (existingClaim) {
          throw new CandidateAlreadyClaimedException(
            `User "${data.authUserId}" has already claimed another candidate in tenant.`
          );
        }
      }
    }

    if (data.privacyAcknowledgment) {
      const policyExists = this.policies.some(
        (p) =>
          p.tenantId === data.tenantId &&
          p.id === data.privacyAcknowledgment?.policyVersionId
      );
      if (!policyExists) {
        throw new PrivacyPolicyVersionNotFoundException(
          `Policy version not found in tenant.`
        );
      }
    }

    const updated: CandidateRecord = {
      ...existing,
      name: data.name ?? existing.name,
      firstName: data.firstName ?? existing.firstName,
      lastName: data.lastName !== undefined ? data.lastName : existing.lastName,
      email: data.email ?? existing.email,
      emailNormalized: data.emailNormalized ?? existing.emailNormalized,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      phoneNormalized:
        data.phoneNormalized !== undefined
          ? data.phoneNormalized
          : existing.phoneNormalized,
      status: data.status ?? existing.status,
      cvUrl: data.cvUrl !== undefined ? data.cvUrl : existing.cvUrl,
      cvRaw: data.cvRaw !== undefined ? data.cvRaw : existing.cvRaw,
      authUserId:
        data.authUserId !== undefined ? data.authUserId : existing.authUserId,
      updatedById: data.updatedById,
      updatedAt: new Date(),
    };

    const index = this.candidates.findIndex((c) => c.id === existing.id);
    this.candidates[index] = updated;

    let provenance: DataProvenanceRecord | null = null;
    if (data.provenance) {
      provenance = {
        id: `prov-${this.provenances.length + 1}`,
        tenantId: data.tenantId,
        candidateId: updated.id,
        source: data.provenance.source,
        channel: data.provenance.channel,
        collectedAt: new Date(),
      };
      this.provenances.push(provenance);
    }

    let privacyAck: PrivacyAcknowledgmentRecord | null = null;
    if (data.privacyAcknowledgment) {
      privacyAck = {
        id: `ack-${this.privacyAcks.length + 1}`,
        tenantId: data.tenantId,
        candidateId: updated.id,
        policyVersionId: data.privacyAcknowledgment.policyVersionId,
        acknowledgedAt: new Date(),
      };
      this.privacyAcks.push(privacyAck);
    }

    return { candidate: updated, provenance, privacyAcknowledgment: privacyAck };
  }
}

describe("Candidate Use Cases (Unit / In-Memory)", () => {
  let repo: InMemoryCandidateRepository;
  const tenantA = "tenant-a-id";
  const tenantB = "tenant-b-id";
  const userId1 = "user-1-id";
  const policyA1 = "policy-a-1";

  const validCtxA: AuthenticatedContext = {
    tenant: { tenantId: tenantA, slug: "tenant-a", name: "Tenant A" },
    actor: {
      userId: "recruiter-1",
      email: "recruiter@tenant-a.com",
      name: "Recruiter One",
    },
    membership: {
      membershipId: "mem-1",
    },
    roles: ["Recruiter"],
    permissions: ["candidate.create", "candidate.update"],
  };

  const noPermissionCtx: AuthenticatedContext = {
    ...validCtxA,
    permissions: ["some.other.permission"],
  };

  beforeEach(() => {
    repo = new InMemoryCandidateRepository();
    repo.users.push({ id: userId1 });
    repo.policies.push({ id: policyA1, tenantId: tenantA });
  });

  describe("createCandidateUseCase", () => {
    it("fails with FORBIDDEN when caller lacks candidate.create permission", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const result = await createCandidate(noPermissionCtx, {
        firstName: "Carlos",
        email: "carlos@example.com",
        provenance: { source: "Website", channel: "Direct" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("successfully creates candidate with provenance and no privacy acknowledgment", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const result = await createCandidate(validCtxA, {
        firstName: "Carlos",
        lastName: "Gomez",
        email: "  Carlos.Gomez@Hospital.com  ",
        phone: "+1 555 123 4567",
        provenance: { source: "LinkedIn", channel: "Outreach" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.candidate.tenantId).toBe(tenantA);
        expect(result.value.candidate.firstName).toBe("Carlos");
        expect(result.value.candidate.lastName).toBe("Gomez");
        expect(result.value.candidate.name).toBe("Carlos Gomez");
        expect(result.value.candidate.email).toBe("Carlos.Gomez@Hospital.com");
        expect(result.value.candidate.emailNormalized).toBe(
          "carlos.gomez@hospital.com"
        );
        expect(result.value.candidate.phoneNormalized).toBe("15551234567");
        expect(result.value.provenance?.source).toBe("LinkedIn");
        expect(result.value.privacyAcknowledgment).toBeNull();
        expect(result.value.duplicates).toEqual([]);
      }
    });

    it("creates candidate with valid exact privacy acknowledgment", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const result = await createCandidate(validCtxA, {
        firstName: "Laura",
        email: "laura@example.com",
        provenance: { source: "Website", channel: "Career Page" },
        privacyAcknowledgment: { policyVersionId: policyA1 },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.privacyAcknowledgment?.policyVersionId).toBe(
          policyA1
        );
      }
    });

    it("detects soft duplicate on email within same tenant without blocking creation", async () => {
      const createCandidate = createCandidateUseCase(repo);

      // Create first candidate
      await createCandidate(validCtxA, {
        firstName: "Original",
        lastName: "Candidate",
        email: "duplicate@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });

      // Create second candidate with same email
      const result = await createCandidate(validCtxA, {
        firstName: "Duplicate",
        lastName: "Entry",
        email: "  DUPLICATE@example.com  ",
        provenance: { source: "Agency", channel: "Referral" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.duplicates.length).toBe(1);
        expect(result.value.duplicates[0].name).toBe("Original Candidate");
        expect(result.value.duplicates[0].matchedOn).toContain("email");
        expect(result.value.candidate.firstName).toBe("Duplicate");
      }
    });

    it("detects soft duplicate on phone within same tenant without blocking creation", async () => {
      const createCandidate = createCandidateUseCase(repo);

      await createCandidate(validCtxA, {
        firstName: "PhoneMatch1",
        email: "first@example.com",
        phone: "+1 (555) 987-6543",
        provenance: { source: "Web", channel: "Direct" },
      });

      const result = await createCandidate(validCtxA, {
        firstName: "PhoneMatch2",
        email: "second@example.com",
        phone: "+1 555.987.6543",
        provenance: { source: "Import", channel: "Batch" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.duplicates.length).toBe(1);
        expect(result.value.duplicates[0].matchedOn).toContain("phone");
      }
    });

    it("does not report candidates in other tenants as duplicates", async () => {
      const createCandidate = createCandidateUseCase(repo);

      // Create candidate in Tenant A
      await createCandidate(validCtxA, {
        firstName: "TenantA Person",
        email: "cross@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });

      // Create candidate in Tenant B with same email
      const validCtxB: AuthenticatedContext = {
        tenant: { tenantId: tenantB, slug: "tenant-b", name: "Tenant B" },
        actor: {
          userId: "recruiter-2",
          email: "recruiter@tenant-b.com",
          name: "Recruiter Two",
        },
        membership: {
          membershipId: "mem-2",
        },
        roles: ["Recruiter"],
        permissions: ["candidate.create", "candidate.update"],
      };

      const result = await createCandidate(validCtxB, {
        firstName: "TenantB Person",
        email: "cross@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.duplicates).toEqual([]);
      }
    });

    it("maps duplicate authUserId claim in same tenant to CANDIDATE_ALREADY_CLAIMED_BY_USER", async () => {
      const createCandidate = createCandidateUseCase(repo);

      // Claim 1
      await createCandidate(validCtxA, {
        firstName: "UserClaim1",
        email: "claim1@example.com",
        authUserId: userId1,
        provenance: { source: "Web", channel: "Direct" },
      });

      // Claim 2 with same authUserId
      const result = await createCandidate(validCtxA, {
        firstName: "UserClaim2",
        email: "claim2@example.com",
        authUserId: userId1,
        provenance: { source: "Web", channel: "Direct" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CANDIDATE_ALREADY_CLAIMED_BY_USER");
      }
    });

    it("maps unknown P2002 repository failure to REPOSITORY_ERROR without leaking details", async () => {
      const failingRepo = new InMemoryCandidateRepository();
      const sensitiveSqlError =
        "Unique constraint failed on the fields: (`internal_secret_token_idx`) at db.host=10.0.0.1";
      failingRepo.createCandidate = async () => {
        const unknownP2002 = Object.assign(new Error(sensitiveSqlError), {
          code: "P2002",
          meta: { target: ["internal_secret_token_idx"] },
        });
        throw unknownP2002;
      };

      const createCandidate = createCandidateUseCase(failingRepo);
      const result = await createCandidate(validCtxA, {
        firstName: "UnknownP2002",
        email: "unknown@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPOSITORY_ERROR");
        expect(result.error.code).not.toBe("CANDIDATE_ALREADY_CLAIMED_BY_USER");
        expect(result.error.message).not.toContain("internal_secret_token");
        expect(result.error.message).not.toContain("10.0.0.1");
        expect(result.error.message).toBe("Failed to create candidate.");
      }
    });

    it("maps missing user for authUserId to AUTH_USER_NOT_FOUND", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const result = await createCandidate(validCtxA, {
        firstName: "GhostUser",
        email: "ghost@example.com",
        authUserId: "non-existent-user-id",
        provenance: { source: "Web", channel: "Direct" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("AUTH_USER_NOT_FOUND");
      }
    });

    it("rejects non-existent or cross-tenant privacy policy version", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const result = await createCandidate(validCtxA, {
        firstName: "PolicyFail",
        email: "policyfail@example.com",
        provenance: { source: "Web", channel: "Direct" },
        privacyAcknowledgment: { policyVersionId: "invalid-policy-id" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PRIVACY_POLICY_VERSION_NOT_FOUND");
      }
    });

    it("aborts creation and returns REPOSITORY_ERROR without leaking details when soft duplicate lookup fails", async () => {
      const failingRepo = new InMemoryCandidateRepository();
      const sensitivePrismaError =
        "DB connection pool timeout during duplicate check at postgres://admin:secret@pg-primary:5432";
      failingRepo.findSoftDuplicates = async () => {
        throw new Error(sensitivePrismaError);
      };

      const createCandidate = createCandidateUseCase(failingRepo);
      const result = await createCandidate(validCtxA, {
        firstName: "FailDupCheck",
        email: "faildup@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("postgres://");
        expect(result.error.message).not.toContain("secret");
        expect(result.error.message).toBe("Failed to perform soft duplicate lookup.");
      }
      // Ensure candidate was NOT created/persisted
      expect(failingRepo.candidates.length).toBe(0);
    });
  });

  describe("updateCandidateUseCase", () => {
    it("fails with FORBIDDEN when caller lacks permissions", async () => {
      const updateCandidate = updateCandidateUseCase(repo);
      const result = await updateCandidate(noPermissionCtx, {
        candidateId: "cand-1",
        firstName: "Test",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("fails with FORBIDDEN when caller only has candidate.create permission (no fallback)", async () => {
      const updateCandidate = updateCandidateUseCase(repo);
      const createOnlyCtx: AuthenticatedContext = {
        ...validCtxA,
        permissions: ["candidate.create"],
      };
      const result = await updateCandidate(createOnlyCtx, {
        candidateId: "cand-1",
        firstName: "Test",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("allows update when caller has candidate.update permission", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const updateCandidate = updateCandidateUseCase(repo);

      const created = await createCandidate(validCtxA, {
        firstName: "PermTest",
        email: "permtest@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });
      expect(created.ok).toBe(true);
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      const updateOnlyCtx: AuthenticatedContext = {
        ...validCtxA,
        permissions: ["candidate.update"],
      };
      const result = await updateCandidate(updateOnlyCtx, {
        candidateId,
        firstName: "PermTestUpdated",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.candidate.firstName).toBe("PermTestUpdated");
      }
    });

    it("fails with CANDIDATE_NOT_FOUND when updating non-existent candidate", async () => {
      const updateCandidate = updateCandidateUseCase(repo);
      const result = await updateCandidate(validCtxA, {
        candidateId: "non-existent-candidate",
        firstName: "UpdatedName",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CANDIDATE_NOT_FOUND");
      }
    });

    it("fails closed with CANDIDATE_NOT_FOUND when attempting cross-tenant update", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const updateCandidate = updateCandidateUseCase(repo);

      // Create in Tenant A
      const created = await createCandidate(validCtxA, {
        firstName: "TenantACandidate",
        email: "tenantA@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });
      expect(created.ok).toBe(true);
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      // Attempt update from Tenant B
      const validCtxB: AuthenticatedContext = {
        tenant: { tenantId: tenantB, slug: "tenant-b", name: "Tenant B" },
        actor: {
          userId: "recruiter-2",
          email: "recruiter@tenant-b.com",
          name: "Recruiter Two",
        },
        membership: {
          membershipId: "mem-2",
        },
        roles: ["Recruiter"],
        permissions: ["candidate.update"],
      };

      const result = await updateCandidate(validCtxB, {
        candidateId,
        firstName: "HackedName",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CANDIDATE_NOT_FOUND");
      }
    });

    it("returns REPOSITORY_ERROR when findByIdInTenant throws, without attempting duplicate lookup or mutation and without leaking details", async () => {
      let duplicateLookupCalled = false;
      let updateMutationCalled = false;

      const sensitiveResolutionError =
        "Fatal PostgreSQL I/O failure querying candidates table with connection token XYZ_SECRET_KEY";
      const failingRepo = new InMemoryCandidateRepository();
      failingRepo.findByIdInTenant = async () => {
        throw new Error(sensitiveResolutionError);
      };
      failingRepo.findSoftDuplicates = async () => {
        duplicateLookupCalled = true;
        return [];
      };
      failingRepo.updateCandidate = async () => {
        updateMutationCalled = true;
        throw new Error("Should not be called");
      };

      const updateCandidate = updateCandidateUseCase(failingRepo);
      const result = await updateCandidate(validCtxA, {
        candidateId: "cand-123",
        firstName: "TestFail",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPOSITORY_ERROR");
        expect(result.error.code).not.toBe("CANDIDATE_NOT_FOUND");
        expect(result.error.message).not.toContain("XYZ_SECRET_KEY");
        expect(result.error.message).toBe("Failed to resolve candidate in tenant.");
      }
      expect(duplicateLookupCalled).toBe(false);
      expect(updateMutationCalled).toBe(false);
    });

    it("aborts update and returns REPOSITORY_ERROR without leaking details when soft duplicate lookup fails", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const created = await createCandidate(validCtxA, {
        firstName: "BeforeUpdate",
        email: "before@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });
      expect(created.ok).toBe(true);
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      const sensitiveLookupError =
        "Network socket timeout accessing replicas at 10.240.0.12:5432 with credential token SECRET_HASH";
      // Mock findSoftDuplicates to fail
      repo.findSoftDuplicates = async () => {
        throw new Error(sensitiveLookupError);
      };

      const updateCandidate = updateCandidateUseCase(repo);
      const result = await updateCandidate(validCtxA, {
        candidateId,
        firstName: "ShouldNotPersist",
        email: "newemail@example.com",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("SECRET_HASH");
        expect(result.error.message).toBe("Failed to perform soft duplicate lookup.");
      }
      // Ensure existing candidate was NOT mutated
      const candidateInRepo = repo.candidates.find((c) => c.id === candidateId);
      expect(candidateInRepo?.firstName).toBe("BeforeUpdate");
      expect(candidateInRepo?.email).toBe("before@example.com");
    });

    it("returns REPOSITORY_ERROR without leaking details when repo.updateCandidate throws an unknown error", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const created = await createCandidate(validCtxA, {
        firstName: "BeforeUpdateMutation",
        email: "before.mutation@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });
      expect(created.ok).toBe(true);
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      const sensitiveUpdateError =
        "PANIC: Prisma engine worker failure on query UPDATE candidates SET ... token=SECRET_SESSION_TOKEN";
      repo.updateCandidate = async () => {
        throw new Error(sensitiveUpdateError);
      };

      const updateCandidate = updateCandidateUseCase(repo);
      const result = await updateCandidate(validCtxA, {
        candidateId,
        firstName: "NewName",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPOSITORY_ERROR");
        expect(result.error.message).not.toContain("SECRET_SESSION_TOKEN");
        expect(result.error.message).toBe("Failed to update candidate.");
      }
    });

    it("successfully updates candidate fields with normalization and appends provenance", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const updateCandidate = updateCandidateUseCase(repo);

      const created = await createCandidate(validCtxA, {
        firstName: "OriginalFirst",
        lastName: "OriginalLast",
        email: "original@example.com",
        provenance: { source: "Web", channel: "Direct" },
      });
      expect(created.ok).toBe(true);
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      const updateResult = await updateCandidate(validCtxA, {
        candidateId,
        firstName: "NewFirst",
        email: "  NewEmail@Hospital.COM  ",
        phone: "(555) 444-3322",
        provenance: { source: "RecruiterEdit", channel: "Manual" },
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.candidate.firstName).toBe("NewFirst");
        expect(updateResult.value.candidate.email).toBe(
          "NewEmail@Hospital.COM"
        );
        expect(updateResult.value.candidate.emailNormalized).toBe(
          "newemail@hospital.com"
        );
        expect(updateResult.value.candidate.phoneNormalized).toBe("5554443322");
        expect(updateResult.value.provenance?.source).toBe("RecruiterEdit");
      }

      // Verify that historical provenance is preserved (now 2 records)
      expect(
        repo.provenances.filter((p) => p.candidateId === candidateId).length
      ).toBe(2);
    });

    it("appends privacy acknowledgment on update without overwriting historical acks", async () => {
      const createCandidate = createCandidateUseCase(repo);
      const updateCandidate = updateCandidateUseCase(repo);

      const created = await createCandidate(validCtxA, {
        firstName: "AckUser",
        email: "ackuser@example.com",
        provenance: { source: "Web", channel: "Direct" },
        privacyAcknowledgment: { policyVersionId: policyA1 },
      });
      const candidateId = (created as { value: { candidate: CandidateRecord } })
        .value.candidate.id;

      // Add a second policy version in Tenant A
      repo.policies.push({ id: "policy-a-2", tenantId: tenantA });

      const updateResult = await updateCandidate(validCtxA, {
        candidateId,
        privacyAcknowledgment: { policyVersionId: "policy-a-2" },
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.privacyAcknowledgment?.policyVersionId).toBe(
          "policy-a-2"
        );
      }

      // Verify both acknowledgments are preserved in append-only store
      const candidateAcks = repo.privacyAcks.filter(
        (a) => a.candidateId === candidateId
      );
      expect(candidateAcks.length).toBe(2);
      expect(candidateAcks[0].policyVersionId).toBe(policyA1);
      expect(candidateAcks[1].policyVersionId).toBe("policy-a-2");
    });
  });
});
