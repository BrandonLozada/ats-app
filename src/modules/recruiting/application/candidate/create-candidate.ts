import { Result, ok, err } from "@/platform/shared/result";
import type { AuthenticatedContext } from "@/modules/organization/public";
import type {
  CreateCandidateInput,
  CandidateMutationResult,
  CandidateDuplicateMatch,
} from "./candidate.types";
import type { CandidateError } from "./candidate.errors";
import { ensureCanCreateCandidate } from "./candidate.policies";
import {
  validateCandidateName,
  validateAndNormalizeEmail,
  normalizePhoneSafe,
  validateProvenanceInput,
  validatePrivacyAckInput,
} from "./candidate.rules";
import {
  CandidateRepositoryPort,
  AuthUserNotFoundException,
  CandidateAlreadyClaimedException,
  PrivacyPolicyVersionNotFoundException,
} from "./ports/candidate-repository";

export function createCandidateUseCase(repo: CandidateRepositoryPort) {
  return async (
    ctx: AuthenticatedContext,
    input: CreateCandidateInput
  ): Promise<Result<CandidateMutationResult, CandidateError>> => {
    // 1. Authorization
    const authCheck = ensureCanCreateCandidate(ctx.permissions);
    if (!authCheck.ok) {
      return authCheck;
    }

    const tenantId = ctx.tenant.tenantId;
    const actorUserId = ctx.actor.userId;

    // 2. Validate names
    const nameCheck = validateCandidateName(
      input.firstName,
      input.lastName,
      input.name
    );
    if (!nameCheck.ok) {
      return nameCheck;
    }
    const { firstName, lastName, name } = nameCheck.value;

    // 3. Validate and normalize email
    const emailCheck = validateAndNormalizeEmail(input.email);
    if (!emailCheck.ok) {
      return emailCheck;
    }
    const { email, emailNormalized } = emailCheck.value;

    // 4. Normalize phone
    const { raw: phone, normalized: phoneNormalized } = normalizePhoneSafe(
      input.phone
    );

    // 5. Validate provenance input
    const provCheck = validateProvenanceInput(input.provenance);
    if (!provCheck.ok) {
      return provCheck;
    }
    const provenance = provCheck.value;

    // 6. Validate privacy acknowledgment input if provided
    const ackCheck = validatePrivacyAckInput(input.privacyAcknowledgment);
    if (!ackCheck.ok) {
      return ackCheck;
    }
    const privacyAck = ackCheck.value;

    // 7. Soft duplicate inspection (non-blocking for matches, but failure aborts mutation)
    let duplicates: readonly CandidateDuplicateMatch[];
    try {
      duplicates = await repo.findSoftDuplicates(tenantId, {
        emailNormalized,
        phoneNormalized,
      });
    } catch {
      return err({
        code: "REPOSITORY_ERROR",
        message: "Failed to perform soft duplicate lookup.",
      });
    }

    // 8. Atomic Candidate creation via repository
    try {
      const created = await repo.createCandidate({
        tenantId,
        authUserId:
          typeof input.authUserId === "string" &&
          input.authUserId.trim().length > 0
            ? input.authUserId.trim()
            : null,
        name,
        firstName,
        lastName,
        email,
        emailNormalized,
        phone,
        phoneNormalized,
        status: input.status ?? "ACTIVE",
        cvUrl:
          typeof input.cvUrl === "string" && input.cvUrl.trim().length > 0
            ? input.cvUrl.trim()
            : null,
        cvRaw:
          typeof input.cvRaw === "string" && input.cvRaw.trim().length > 0
            ? input.cvRaw
            : null,
        createdById: actorUserId,
        provenance,
        privacyAcknowledgment: privacyAck,
      });

      return ok({
        candidate: created.candidate,
        duplicates,
        provenance: created.provenance,
        privacyAcknowledgment: created.privacyAcknowledgment,
      });
    } catch (e: unknown) {
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
        message: "Failed to create candidate.",
      });
    }
  };
}
