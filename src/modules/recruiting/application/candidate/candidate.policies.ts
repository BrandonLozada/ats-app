import { Result, ok, err } from "@/platform/shared/result";
import { CandidateError } from "./candidate.errors";

export const CANDIDATE_PERMISSIONS = {
  CREATE: "candidate.create",
  UPDATE: "candidate.update",
} as const;

export function ensureCanCreateCandidate(
  permissions: readonly string[]
): Result<void, CandidateError> {
  if (!permissions.includes(CANDIDATE_PERMISSIONS.CREATE)) {
    return err({
      code: "FORBIDDEN",
      message: "Forbidden: Missing required permission candidate.create.",
    });
  }
  return ok(undefined);
}

export function ensureCanUpdateCandidate(
  permissions: readonly string[]
): Result<void, CandidateError> {
  if (!permissions.includes(CANDIDATE_PERMISSIONS.UPDATE)) {
    return err({
      code: "FORBIDDEN",
      message: "Forbidden: Missing required permission candidate.update.",
    });
  }
  return ok(undefined);
}
