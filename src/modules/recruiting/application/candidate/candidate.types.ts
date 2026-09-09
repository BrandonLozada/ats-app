export type CandidateStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "BLACKLISTED";

export type DataProvenanceRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly candidateId: string;
  readonly source: string;
  readonly channel: string;
  readonly collectedAt: Date;
};

export type PrivacyAcknowledgmentRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly candidateId: string;
  readonly policyVersionId: string;
  readonly acknowledgedAt: Date;
};

export type CandidateRecord = {
  readonly id: string;
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
  readonly cvParsedData: unknown | null;
  readonly cvParsedAt: Date | null;
  readonly dataCompleteness: number;
  readonly deletedAt: Date | null;
  readonly createdById: string | null;
  readonly createdAt: Date;
  readonly updatedById: string | null;
  readonly updatedAt: Date;
};

export type CandidateSummary = {
  readonly id: string;
  readonly tenantId: string;
  readonly authUserId: string | null;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly status: CandidateStatus;
  readonly createdAt: Date;
};

export type CandidateDuplicateMatch = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly matchedOn: readonly ("email" | "phone")[];
  readonly createdAt: Date;
};

export type CandidateMutationResult = {
  readonly candidate: CandidateRecord;
  readonly duplicates: readonly CandidateDuplicateMatch[];
  readonly provenance: DataProvenanceRecord | null;
  readonly privacyAcknowledgment: PrivacyAcknowledgmentRecord | null;
};

export type CreateDataProvenanceInput = {
  readonly source: string;
  readonly channel: string;
};

export type CreatePrivacyAcknowledgmentInput = {
  readonly policyVersionId: string;
};

export type CreateCandidateInput = {
  readonly firstName: string;
  readonly lastName?: string | null;
  readonly name?: string | null;
  readonly email: string;
  readonly phone?: string | null;
  readonly authUserId?: string | null;
  readonly status?: CandidateStatus;
  readonly cvUrl?: string | null;
  readonly cvRaw?: string | null;
  readonly provenance: CreateDataProvenanceInput;
  readonly privacyAcknowledgment?: CreatePrivacyAcknowledgmentInput | null;
};

export type UpdateCandidateInput = {
  readonly candidateId: string;
  readonly firstName?: string;
  readonly lastName?: string | null;
  readonly name?: string | null;
  readonly email?: string;
  readonly phone?: string | null;
  readonly authUserId?: string | null;
  readonly status?: CandidateStatus;
  readonly cvUrl?: string | null;
  readonly cvRaw?: string | null;
  readonly provenance?: CreateDataProvenanceInput | null;
  readonly privacyAcknowledgment?: CreatePrivacyAcknowledgmentInput | null;
};
