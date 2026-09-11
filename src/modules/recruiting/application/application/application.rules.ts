import { Result, ok, err } from "@/platform/shared/result";
import type { ApplicationOutcome } from "./application.types";
import type { ApplicationError } from "./application.errors";

export function isTerminalApplicationOutcome(outcome: ApplicationOutcome): boolean {
  return (
    outcome === "HIRED" ||
    outcome === "REJECTED" ||
    outcome === "WITHDRAWN" ||
    outcome === "CANCELLED"
  );
}

export function assertApplicationIsActive(
  outcome: ApplicationOutcome
): Result<void, ApplicationError> {
  if (isTerminalApplicationOutcome(outcome)) {
    return err({
      code: "APPLICATION_ALREADY_TERMINAL",
      message: "Application is already in a terminal state.",
    });
  }
  return ok(undefined);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}
