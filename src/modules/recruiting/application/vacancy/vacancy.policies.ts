import { Result, ok, err } from "@/platform/shared/result";
import { VacancyError } from "./vacancy.errors";

export const VACANCY_PERMISSIONS = {
  CREATE: "vacancy.create",
  PUBLISH: "vacancy.publish",
} as const;

export function ensureCanCreateVacancy(
  permissions: readonly string[]
): Result<void, VacancyError> {
  if (!permissions.includes(VACANCY_PERMISSIONS.CREATE)) {
    return err({
      code: "FORBIDDEN",
      message: "Forbidden: Missing required permission vacancy.create.",
    });
  }
  return ok(undefined);
}

export function ensureCanPublishVacancy(
  permissions: readonly string[]
): Result<void, VacancyError> {
  if (!permissions.includes(VACANCY_PERMISSIONS.PUBLISH)) {
    return err({
      code: "FORBIDDEN",
      message: "Forbidden: Missing required permission vacancy.publish.",
    });
  }
  return ok(undefined);
}
