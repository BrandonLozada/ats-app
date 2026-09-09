import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type {
  CandidateRecord,
  CandidateStatus,
  CandidateDuplicateMatch,
  DataProvenanceRecord,
  PrivacyAcknowledgmentRecord,
} from "../application/candidate/candidate.types";
import {
  CandidateRepositoryPort,
  CreateCandidateData,
  UpdateCandidateData,
  FindSoftDuplicatesCriteria,
  CandidateNotFoundException,
  CandidateAlreadyClaimedException,
  AuthUserNotFoundException,
  PrivacyPolicyVersionNotFoundException,
} from "../application/candidate/ports/candidate-repository";

type PrismaCandidate = {
  id: string;
  tenantId: string;
  authUserId: string | null;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string;
  emailNormalized: string;
  phone: string | null;
  phoneNormalized: string | null;
  status: string;
  sourceId: string | null;
  cvUrl: string | null;
  cvRaw: string | null;
  cvParsedData: unknown | null;
  cvParsedAt: Date | null;
  dataCompleteness: number;
  deletedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedById: string | null;
  updatedAt: Date;
};

type PrismaDataProvenance = {
  id: string;
  tenantId: string;
  candidateId: string;
  source: string;
  channel: string;
  collectedAt: Date;
};

type PrismaPrivacyAcknowledgment = {
  id: string;
  tenantId: string;
  candidateId: string;
  policyVersionId: string;
  acknowledgedAt: Date;
};

function mapToCandidateRecord(raw: PrismaCandidate): CandidateRecord {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    authUserId: raw.authUserId,
    name: raw.name,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    emailNormalized: raw.emailNormalized,
    phone: raw.phone,
    phoneNormalized: raw.phoneNormalized,
    status: raw.status as CandidateStatus,
    cvUrl: raw.cvUrl,
    cvRaw: raw.cvRaw,
    cvParsedData: raw.cvParsedData,
    cvParsedAt: raw.cvParsedAt,
    dataCompleteness: raw.dataCompleteness,
    deletedAt: raw.deletedAt,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedById: raw.updatedById,
    updatedAt: raw.updatedAt,
  };
}

function mapToDataProvenanceRecord(
  raw: PrismaDataProvenance
): DataProvenanceRecord {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    candidateId: raw.candidateId,
    source: raw.source,
    channel: raw.channel,
    collectedAt: raw.collectedAt,
  };
}

function mapToPrivacyAcknowledgmentRecord(
  raw: PrismaPrivacyAcknowledgment
): PrivacyAcknowledgmentRecord {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    candidateId: raw.candidateId,
    policyVersionId: raw.policyVersionId,
    acknowledgedAt: raw.acknowledgedAt,
  };
}

function isPrismaError(
  e: unknown
): e is { code: string; meta?: Record<string, unknown>; message?: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}

function isCandidateAuthUserUniqueViolation(e: {
  code: string;
  meta?: Record<string, unknown>;
  message?: string;
}): boolean {
  if (e.code !== "P2002") {
    return false;
  }
  const target = e.meta?.target;
  if (Array.isArray(target)) {
    const targetStr = target.join(",");
    if (
      (targetStr.includes("tenant") && targetStr.includes("auth_user")) ||
      (targetStr.includes("tenant") && targetStr.includes("authUser"))
    ) {
      return true;
    }
  } else if (typeof target === "string") {
    if (
      (target.includes("tenant") && target.includes("auth_user")) ||
      (target.includes("tenant") && target.includes("authUser"))
    ) {
      return true;
    }
  }
  const message = String(e.message ?? "");
  if (
    message.includes("candidates_tenant_id_auth_user_id_key") ||
    (message.includes("tenant_id") && message.includes("auth_user_id"))
  ) {
    return true;
  }
  return false;
}

export class PrismaCandidateRepository implements CandidateRepositoryPort {
  async findByIdInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateRecord | null> {
    const candidate = await prisma.candidate.findFirst({
      where: {
        tenantId,
        id: candidateId,
        deletedAt: null,
      },
    });

    if (!candidate) {
      return null;
    }

    return mapToCandidateRecord(candidate);
  }

  async findByAuthUserIdInTenant(
    tenantId: string,
    authUserId: string
  ): Promise<CandidateRecord | null> {
    const candidate = await prisma.candidate.findUnique({
      where: {
        tenantId_authUserId: {
          tenantId,
          authUserId,
        },
      },
    });

    if (!candidate || candidate.deletedAt !== null) {
      return null;
    }

    return mapToCandidateRecord(candidate);
  }

  async findSoftDuplicates(
    tenantId: string,
    criteria: FindSoftDuplicatesCriteria
  ): Promise<readonly CandidateDuplicateMatch[]> {
    const conditions: Array<
      | { emailNormalized: string }
      | { phoneNormalized: string }
    > = [{ emailNormalized: criteria.emailNormalized }];

    if (
      criteria.phoneNormalized &&
      criteria.phoneNormalized.trim().length > 0
    ) {
      conditions.push({ phoneNormalized: criteria.phoneNormalized.trim() });
    }

    const matched = await prisma.candidate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(criteria.excludeCandidateId
          ? { id: { not: criteria.excludeCandidateId } }
          : {}),
        OR: conditions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailNormalized: true,
        phone: true,
        phoneNormalized: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return matched.map((c): CandidateDuplicateMatch => {
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
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        matchedOn,
        createdAt: c.createdAt,
      };
    });
  }

  async createCandidate(data: CreateCandidateData): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. If authUserId supplied, verify User exists and is not already claimed
        if (data.authUserId) {
          const user = await tx.user.findUnique({
            where: { id: data.authUserId },
            select: { id: true },
          });
          if (!user) {
            throw new AuthUserNotFoundException(
              `User "${data.authUserId}" not found.`
            );
          }

          const existingClaim = await tx.candidate.findUnique({
            where: {
              tenantId_authUserId: {
                tenantId: data.tenantId,
                authUserId: data.authUserId,
              },
            },
            select: { id: true },
          });
          if (existingClaim) {
            throw new CandidateAlreadyClaimedException(
              `User "${data.authUserId}" has already claimed a candidate in tenant "${data.tenantId}".`
            );
          }
        }

        // 2. If privacy acknowledgment supplied, verify PrivacyPolicyVersion belongs to same tenant
        if (data.privacyAcknowledgment) {
          const policy = await tx.privacyPolicyVersion.findUnique({
            where: {
              tenantId_id: {
                tenantId: data.tenantId,
                id: data.privacyAcknowledgment.policyVersionId,
              },
            },
            select: { id: true },
          });
          if (!policy) {
            throw new PrivacyPolicyVersionNotFoundException(
              `PrivacyPolicyVersion "${data.privacyAcknowledgment.policyVersionId}" not found in tenant "${data.tenantId}".`
            );
          }
        }

        // 3. Create Candidate
        const candidate = await tx.candidate.create({
          data: {
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
            createdById: data.createdById,
          },
        });

        // 4. Create DataProvenance (append-only)
        const provenance = await tx.dataProvenance.create({
          data: {
            tenantId: data.tenantId,
            candidateId: candidate.id,
            source: data.provenance.source,
            channel: data.provenance.channel,
          },
        });

        // 5. Optionally create PrivacyAcknowledgment (append-only)
        let privacyAck: PrismaPrivacyAcknowledgment | null = null;
        if (data.privacyAcknowledgment) {
          privacyAck = await tx.privacyAcknowledgment.create({
            data: {
              tenantId: data.tenantId,
              candidateId: candidate.id,
              policyVersionId: data.privacyAcknowledgment.policyVersionId,
            },
          });
        }

        return {
          candidate: mapToCandidateRecord(candidate),
          provenance: mapToDataProvenanceRecord(provenance),
          privacyAcknowledgment: privacyAck
            ? mapToPrivacyAcknowledgmentRecord(privacyAck)
            : null,
        };
      });
    } catch (e: unknown) {
      if (
        e instanceof AuthUserNotFoundException ||
        e instanceof CandidateAlreadyClaimedException ||
        e instanceof PrivacyPolicyVersionNotFoundException
      ) {
        throw e;
      }

      if (isPrismaError(e)) {
        if (e.code === "P2002") {
          if (isCandidateAuthUserUniqueViolation(e)) {
            throw new CandidateAlreadyClaimedException(
              `User "${data.authUserId}" has already claimed a candidate in tenant "${data.tenantId}".`
            );
          }
          throw e;
        }
        if (e.code === "P2003") {
          const target = String(e.meta?.field_name ?? e.message ?? "");
          if (target.includes("auth_user_id")) {
            throw new AuthUserNotFoundException(
              `User "${data.authUserId}" not found.`
            );
          }
          if (target.includes("policy_version_id")) {
            throw new PrivacyPolicyVersionNotFoundException(
              `PrivacyPolicyVersion "${data.privacyAcknowledgment?.policyVersionId}" not found in tenant "${data.tenantId}".`
            );
          }
        }
      }

      throw e;
    }
  }

  async updateCandidate(data: UpdateCandidateData): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord | null;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Resolve existing candidate in tenant
        const existing = await tx.candidate.findFirst({
          where: {
            tenantId: data.tenantId,
            id: data.candidateId,
            deletedAt: null,
          },
        });
        if (!existing) {
          throw new CandidateNotFoundException(
            `Candidate "${data.candidateId}" not found in tenant "${data.tenantId}".`
          );
        }

        // 2. If authUserId is provided, verify User exists and is not claimed by another candidate
        if (data.authUserId !== undefined && data.authUserId !== null) {
          if (data.authUserId !== existing.authUserId) {
            const user = await tx.user.findUnique({
              where: { id: data.authUserId },
              select: { id: true },
            });
            if (!user) {
              throw new AuthUserNotFoundException(
                `User "${data.authUserId}" not found.`
              );
            }

            const existingClaim = await tx.candidate.findUnique({
              where: {
                tenantId_authUserId: {
                  tenantId: data.tenantId,
                  authUserId: data.authUserId,
                },
              },
              select: { id: true },
            });
            if (existingClaim && existingClaim.id !== data.candidateId) {
              throw new CandidateAlreadyClaimedException(
                `User "${data.authUserId}" has already claimed candidate "${existingClaim.id}" in tenant "${data.tenantId}".`
              );
            }
          }
        }

        // 3. If privacy acknowledgment supplied, verify PrivacyPolicyVersion belongs to same tenant
        if (data.privacyAcknowledgment) {
          const policy = await tx.privacyPolicyVersion.findUnique({
            where: {
              tenantId_id: {
                tenantId: data.tenantId,
                id: data.privacyAcknowledgment.policyVersionId,
              },
            },
            select: { id: true },
          });
          if (!policy) {
            throw new PrivacyPolicyVersionNotFoundException(
              `PrivacyPolicyVersion "${data.privacyAcknowledgment.policyVersionId}" not found in tenant "${data.tenantId}".`
            );
          }
        }

        // 4. Update Candidate fields
        const updatePayload: Record<string, unknown> = {
          updatedById: data.updatedById,
        };
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.firstName !== undefined)
          updatePayload.firstName = data.firstName;
        if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
        if (data.email !== undefined) {
          updatePayload.email = data.email;
          updatePayload.emailNormalized = data.emailNormalized;
        }
        if (data.phone !== undefined) {
          updatePayload.phone = data.phone;
          updatePayload.phoneNormalized = data.phoneNormalized;
        }
        if (data.status !== undefined) updatePayload.status = data.status;
        if (data.cvUrl !== undefined) updatePayload.cvUrl = data.cvUrl;
        if (data.cvRaw !== undefined) updatePayload.cvRaw = data.cvRaw;
        if (data.authUserId !== undefined)
          updatePayload.authUserId = data.authUserId;

        const updated = await tx.candidate.update({
          where: {
            tenantId_id: {
              tenantId: data.tenantId,
              id: data.candidateId,
            },
          },
          data: updatePayload,
        });

        // 5. Append provenance if supplied
        let provenance: PrismaDataProvenance | null = null;
        if (data.provenance) {
          provenance = await tx.dataProvenance.create({
            data: {
              tenantId: data.tenantId,
              candidateId: data.candidateId,
              source: data.provenance.source,
              channel: data.provenance.channel,
            },
          });
        }

        // 6. Append privacy acknowledgment if supplied
        let privacyAck: PrismaPrivacyAcknowledgment | null = null;
        if (data.privacyAcknowledgment) {
          privacyAck = await tx.privacyAcknowledgment.create({
            data: {
              tenantId: data.tenantId,
              candidateId: data.candidateId,
              policyVersionId: data.privacyAcknowledgment.policyVersionId,
            },
          });
        }

        return {
          candidate: mapToCandidateRecord(updated),
          provenance: provenance
            ? mapToDataProvenanceRecord(provenance)
            : null,
          privacyAcknowledgment: privacyAck
            ? mapToPrivacyAcknowledgmentRecord(privacyAck)
            : null,
        };
      });
    } catch (e: unknown) {
      if (
        e instanceof CandidateNotFoundException ||
        e instanceof AuthUserNotFoundException ||
        e instanceof CandidateAlreadyClaimedException ||
        e instanceof PrivacyPolicyVersionNotFoundException
      ) {
        throw e;
      }

      if (isPrismaError(e)) {
        if (e.code === "P2002") {
          if (isCandidateAuthUserUniqueViolation(e)) {
            throw new CandidateAlreadyClaimedException(
              `User "${data.authUserId}" has already claimed a candidate in tenant "${data.tenantId}".`
            );
          }
          throw e;
        }
        if (e.code === "P2003") {
          const target = String(e.meta?.field_name ?? e.message ?? "");
          if (target.includes("auth_user_id")) {
            throw new AuthUserNotFoundException(
              `User "${data.authUserId}" not found.`
            );
          }
          if (target.includes("policy_version_id")) {
            throw new PrivacyPolicyVersionNotFoundException(
              `PrivacyPolicyVersion "${data.privacyAcknowledgment?.policyVersionId}" not found in tenant "${data.tenantId}".`
            );
          }
        }
      }

      throw e;
    }
  }
}
