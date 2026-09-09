import { Result, ok, err } from "@/platform/shared/result";
import { CandidateError } from "./candidate.errors";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import { normalizePhone } from "@/shared/utils/normalize-phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAndNormalizeEmail(
  email: unknown
): Result<{ email: string; emailNormalized: string }, CandidateError> {
  if (typeof email !== "string" || email.trim().length === 0) {
    return err({
      code: "INVALID_CANDIDATE_EMAIL",
      message: "Candidate email is required.",
    });
  }

  const trimmed = email.trim();
  const normalized = normalizeEmail(trimmed);

  if (!EMAIL_REGEX.test(normalized)) {
    return err({
      code: "INVALID_CANDIDATE_EMAIL",
      message: `Invalid candidate email format: "${trimmed}".`,
    });
  }

  return ok({
    email: trimmed,
    emailNormalized: normalized,
  });
}

export function normalizePhoneSafe(phone: unknown): {
  raw: string | null;
  normalized: string | null;
} {
  if (typeof phone !== "string") {
    return { raw: null, normalized: null };
  }

  const trimmed = phone.trim();
  if (trimmed.length === 0) {
    return { raw: null, normalized: null };
  }

  const digits = normalizePhone(trimmed);
  return {
    raw: trimmed,
    normalized: digits.length > 0 ? digits : null,
  };
}

export function validateCandidateName(
  firstName: unknown,
  lastName?: unknown,
  name?: unknown
): Result<
  { firstName: string; lastName: string | null; name: string },
  CandidateError
> {
  if (typeof firstName !== "string" || firstName.trim().length === 0) {
    return err({
      code: "INVALID_CANDIDATE_INPUT",
      message: "Candidate firstName is required and cannot be empty.",
    });
  }

  const trimmedFirst = firstName.trim();
  const trimmedLast =
    typeof lastName === "string" && lastName.trim().length > 0
      ? lastName.trim()
      : null;

  let computedName: string;
  if (typeof name === "string" && name.trim().length > 0) {
    computedName = name.trim();
  } else if (trimmedLast) {
    computedName = `${trimmedFirst} ${trimmedLast}`;
  } else {
    computedName = trimmedFirst;
  }

  return ok({
    firstName: trimmedFirst,
    lastName: trimmedLast,
    name: computedName,
  });
}

export function validateProvenanceInput(
  provenance: unknown
): Result<{ source: string; channel: string }, CandidateError> {
  if (!provenance || typeof provenance !== "object") {
    return err({
      code: "INVALID_CANDIDATE_INPUT",
      message: "Data provenance (source and channel) is required.",
    });
  }

  const record = provenance as Record<string, unknown>;
  const source =
    typeof record.source === "string" ? record.source.trim() : "";
  const channel =
    typeof record.channel === "string" ? record.channel.trim() : "";

  if (source.length === 0 || channel.length === 0) {
    return err({
      code: "INVALID_CANDIDATE_INPUT",
      message: "Data provenance must have non-empty source and channel.",
    });
  }

  return ok({ source, channel });
}

export function validatePrivacyAckInput(
  ack: unknown
): Result<{ policyVersionId: string } | null, CandidateError> {
  if (ack === undefined || ack === null) {
    return ok(null);
  }

  if (typeof ack !== "object") {
    return err({
      code: "INVALID_CANDIDATE_INPUT",
      message: "Privacy acknowledgment must be an object when provided.",
    });
  }

  const record = ack as Record<string, unknown>;
  const policyVersionId =
    typeof record.policyVersionId === "string"
      ? record.policyVersionId.trim()
      : "";

  if (policyVersionId.length === 0) {
    return err({
      code: "INVALID_CANDIDATE_INPUT",
      message: "Privacy acknowledgment requires a non-empty policyVersionId.",
    });
  }

  return ok({ policyVersionId });
}
