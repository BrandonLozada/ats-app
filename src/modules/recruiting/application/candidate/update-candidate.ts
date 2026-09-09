import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import type {
  UpdateCandidateInput,
  CandidateMutationResult,
  CandidateDuplicateMatch,
  CandidateRecord,
} from "./candidate.types";
import type { CandidateError } from "./candidate.errors";
import { ensureCanUpdateCandidate } from "./candidate.policies";
import {
  validateCandidateName,
  validateAndNormalizeEmail,
  normalizePhoneSafe,
  validateProvenanceInput,
  validatePrivacyAckInput,
} from "./candidate.rules";
import {
  CandidateRepositoryPort,
  CandidateNotFoundException,
  AuthUserNotFoundException,
  CandidateAlreadyClaimedException,
  PrivacyPolicyVersionNotFoundException,
} from "./ports/candidate-repository";

export function updateCandidateUseCase(repo: CandidateRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: UpdateCandidateInput
  ): Promise<Result<CandidateMutationResult, CandidateError>> => {
    // 1. Authorization
    const authCheck = ensureCanUpdateCandidate(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    const tenantId = ctx.tenant.tenantId;
    const actorUserId = ctx.actor.userId;

    if (
      typeof input.candidateId !== "string" ||
      input.candidateId.trim().length === 0
    ) {
      return err({
        code: "INVALID_CANDIDATE_INPUT",
        message: "candidateId is required for candidate update.",
      });
    }
    const candidateId = input.candidateId.trim();

    // 2. Resolve Candidate inside ctx tenant (fail closed on cross-tenant or missing)
    let existing: CandidateRecord | null;
    try {
      existing = await repo.findByIdInTenant(tenantId, candidateId);
    } catch {
      return err({
        code: "REPOSITORY_ERROR",
        message: "Failed to resolve candidate in tenant.",
      });
    }

    if (!existing) {
      return err({
        code: "CANDIDATE_NOT_FOUND",
        message: `Candidate "${candidateId}" not found.`,
      });
    }

    // 3. Validate changed fields
    let firstName: string | undefined;
    let lastName: string | null | undefined;
    let name: string | undefined;

    if (
      input.firstName !== undefined ||
      input.lastName !== undefined ||
      input.name !== undefined
    ) {
      const targetFirst =
        input.firstName !== undefined ? input.firstName : existing.firstName;
      const targetLast =
        input.lastName !== undefined ? input.lastName : existing.lastName;
      const targetName =
        input.name !== undefined
          ? input.name
          : input.firstName || input.lastName
            ? null
            : existing.name;

      const nameCheck = validateCandidateName(
        targetFirst,
        targetLast,
        targetName
      );
      if (!nameCheck.ok) {
        return nameCheck;
      }
      firstName = nameCheck.value.firstName;
      lastName = nameCheck.value.lastName;
      name = nameCheck.value.name;
    }

    let email: string | undefined;
    let emailNormalized: string | undefined;
    if (input.email !== undefined) {
      const emailCheck = validateAndNormalizeEmail(input.email);
      if (!emailCheck.ok) {
        return emailCheck;
      }
      email = emailCheck.value.email;
      emailNormalized = emailCheck.value.emailNormalized;
    }

    let phone: string | null | undefined;
    let phoneNormalized: string | null | undefined;
    if (input.phone !== undefined) {
      const phoneResult = normalizePhoneSafe(input.phone);
      phone = phoneResult.raw;
      phoneNormalized = phoneResult.normalized;
    }

    // 4. Validate provenance if supplied (append-only)
    let provenance: { source: string; channel: string } | null = null;
    if (input.provenance !== undefined && input.provenance !== null) {
      const provCheck = validateProvenanceInput(input.provenance);
      if (!provCheck.ok) {
        return provCheck;
      }
      provenance = provCheck.value;
    }

    // 5. Validate privacy acknowledgment if supplied (append-only)
    let privacyAck: { policyVersionId: string } | null = null;
    if (
      input.privacyAcknowledgment !== undefined &&
      input.privacyAcknowledgment !== null
    ) {
      const ackCheck = validatePrivacyAckInput(input.privacyAcknowledgment);
      if (!ackCheck.ok) {
        return ackCheck;
      }
      privacyAck = ackCheck.value;
    }

    // 6. Soft duplicate inspection (excluding current candidate; failure aborts mutation)
    const checkEmail = emailNormalized ?? existing.emailNormalized;
    const checkPhone =
      phoneNormalized !== undefined ? phoneNormalized : existing.phoneNormalized;
    let duplicates: readonly CandidateDuplicateMatch[];
    try {
      duplicates = await repo.findSoftDuplicates(tenantId, {
        emailNormalized: checkEmail,
        phoneNormalized: checkPhone,
        excludeCandidateId: candidateId,
      });
    } catch {
      return err({
        code: "REPOSITORY_ERROR",
        message: "Failed to perform soft duplicate lookup.",
      });
    }

    // 7. Persist changes atomically
    try {
      const updated = await repo.updateCandidate({
        tenantId,
        candidateId,
        updatedById: actorUserId,
        name,
        firstName,
        lastName,
        email,
        emailNormalized,
        phone,
        phoneNormalized,
        status: input.status,
        cvUrl:
          input.cvUrl !== undefined
            ? typeof input.cvUrl === "string" && input.cvUrl.trim().length > 0
              ? input.cvUrl.trim()
              : null
            : undefined,
        cvRaw:
          input.cvRaw !== undefined
            ? typeof input.cvRaw === "string" && input.cvRaw.trim().length > 0
              ? input.cvRaw
              : null
            : undefined,
        authUserId:
          input.authUserId !== undefined
            ? typeof input.authUserId === "string" &&
              input.authUserId.trim().length > 0
              ? input.authUserId.trim()
              : null
            : undefined,
        provenance,
        privacyAcknowledgment: privacyAck,
      });

      return ok({
        candidate: updated.candidate,
        duplicates,
        provenance: updated.provenance,
        privacyAcknowledgment: updated.privacyAcknowledgment,
      });
    } catch (e: unknown) {
      if (e instanceof CandidateNotFoundException) {
        return err({
          code: "CANDIDATE_NOT_FOUND",
          message: e.message,
        });
      }
      if (e instanceof AuthUserNotFoundException) {
        return err({
          code: "AUTH_USER_NOT_FOUND",
          message: e.message,
        });
      }
      if (e instanceof CandidateAlreadyClaimedException) {
        return err({
          code: "CANDIDATE_ALREADY_CLAIMED_BY_USER",
          message: e.message,
        });
      }
      if (e instanceof PrivacyPolicyVersionNotFoundException) {
        return err({
          code: "PRIVACY_POLICY_VERSION_NOT_FOUND",
          message: e.message,
        });
      }
      return err({
        code: "REPOSITORY_ERROR",
        message: "Failed to update candidate.",
      });
    }
  };
}
