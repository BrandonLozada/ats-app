import type {
  CandidateRecord,
  CandidateStatus,
  CandidateDuplicateMatch,
  DataProvenanceRecord,
  PrivacyAcknowledgmentRecord,
} from "../candidate.types";

export class CandidateNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateNotFoundException";
  }
}

export class CandidateAlreadyClaimedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateAlreadyClaimedException";
  }
}

export class AuthUserNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthUserNotFoundException";
  }
}

export class PrivacyPolicyVersionNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivacyPolicyVersionNotFoundException";
  }
}

export type FindSoftDuplicatesCriteria = {
  readonly emailNormalized: string;
  readonly phoneNormalized?: string | null;
  readonly excludeCandidateId?: string;
};

export type CreateCandidateData = {
  readonly tenantId: string;
  readonly authUserId: string | null;
  readonly name: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly email: string;
  readonly emailNormalized: string;
  readonly phone: string | null;
  readonly phoneNormalized: string | null;
  readonly status: CandidateStatus;
  readonly cvUrl: string | null;
  readonly cvRaw: string | null;
  readonly createdById: string | null;
  readonly provenance: {
    readonly source: string;
    readonly channel: string;
  };
  readonly privacyAcknowledgment?: {
    readonly policyVersionId: string;
  } | null;
};

export type UpdateCandidateData = {
  readonly tenantId: string;
  readonly candidateId: string;
  readonly updatedById: string | null;
  readonly name?: string;
  readonly firstName?: string;
  readonly lastName?: string | null;
  readonly email?: string;
  readonly emailNormalized?: string;
  readonly phone?: string | null;
  readonly phoneNormalized?: string | null;
  readonly status?: CandidateStatus;
  readonly cvUrl?: string | null;
  readonly cvRaw?: string | null;
  readonly authUserId?: string | null;
  readonly provenance?: {
    readonly source: string;
    readonly channel: string;
  } | null;
  readonly privacyAcknowledgment?: {
    readonly policyVersionId: string;
  } | null;
};

export interface CandidateRepositoryPort {
  findByIdInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<CandidateRecord | null>;

  findByAuthUserIdInTenant(
    tenantId: string,
    authUserId: string
  ): Promise<CandidateRecord | null>;

  findSoftDuplicates(
    tenantId: string,
    criteria: FindSoftDuplicatesCriteria
  ): Promise<readonly CandidateDuplicateMatch[]>;

  createCandidate(
    data: CreateCandidateData
  ): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }>;

  updateCandidate(
    data: UpdateCandidateData
  ): Promise<{
    candidate: CandidateRecord;
    provenance: DataProvenanceRecord | null;
    privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
  }>;
}
