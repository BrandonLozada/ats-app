import { describe, it, expect } from "vitest";
import {
  isTerminalApplicationOutcome,
  assertApplicationIsActive,
  isValidUuid,
} from "./application.rules";
import type { ApplicationOutcome } from "./application.types";

describe("Application Domain Rules", () => {
  describe("isTerminalApplicationOutcome", () => {
    it("identifies NONE as non-terminal (active)", () => {
      expect(isTerminalApplicationOutcome("NONE")).toBe(false);
    });

    it("identifies terminal outcomes correctly", () => {
      const terminalOutcomes: ApplicationOutcome[] = [
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
        "CANCELLED",
      ];

      for (const outcome of terminalOutcomes) {
        expect(isTerminalApplicationOutcome(outcome)).toBe(true);
      }
    });
  });

  describe("assertApplicationIsActive", () => {
    it("returns ok for active outcome NONE", () => {
      const result = assertApplicationIsActive("NONE");
      expect(result.ok).toBe(true);
    });

    it("returns error for terminal outcomes", () => {
      const terminalOutcomes: ApplicationOutcome[] = [
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
        "CANCELLED",
      ];

      for (const outcome of terminalOutcomes) {
        const result = assertApplicationIsActive(outcome);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("APPLICATION_ALREADY_TERMINAL");
          expect(result.error.message).toBe("Application is already in a terminal state.");
        }
      }
    });
  });

  describe("isValidUuid", () => {
    it("accepts valid v4/v7 UUIDs", () => {
      expect(isValidUuid("98300000-0000-4000-a000-000000000001")).toBe(true);
      expect(isValidUuid("c85b5250-9851-4fa3-94c6-2c5e5ba3cbfa")).toBe(true);
    });

    it("rejects invalid UUID strings", () => {
      expect(isValidUuid("")).toBe(false);
      expect(isValidUuid("invalid-uuid")).toBe(false);
      expect(isValidUuid("98300000-0000-4000-a000")).toBe(false);
      expect(isValidUuid("12345")).toBe(false);
    });
  });
});
