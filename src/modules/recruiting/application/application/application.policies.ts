import { Result, ok, err } from "@/platform/shared/result";
import type { ApplicationError } from "./application.errors";

export const APPLICATION_PERMISSIONS = {
  CREATE: "application.create",
} as const;

export function ensureCanCreateApplication(
  permissions: readonly string[]
): Result<void, ApplicationError> {
  if (!permissions.includes(APPLICATION_PERMISSIONS.CREATE)) {
    return err({
      code: "FORBIDDEN",
      message: "Forbidden: Missing required permission application.create.",
    });
  }
  return ok(undefined);
}
