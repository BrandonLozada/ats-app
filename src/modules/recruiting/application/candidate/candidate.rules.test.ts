import { describe, it, expect } from "vitest";
import {
  validateAndNormalizeEmail,
  normalizePhoneSafe,
  validateCandidateName,
  validateProvenanceInput,
  validatePrivacyAckInput,
} from "./candidate.rules";

describe("Candidate Domain Rules & Normalization (Pure Unit)", () => {
  describe("validateAndNormalizeEmail", () => {
    it("normalizes valid email by trimming and converting to lowercase", () => {
      const result = validateAndNormalizeEmail("  Candidate.User@Example.COM  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe("Candidate.User@Example.COM");
        expect(result.value.emailNormalized).toBe("candidate.user@example.com");
      }
    });

    it("rejects empty, whitespace-only, or non-string email", () => {
      expect(validateAndNormalizeEmail("").ok).toBe(false);
      expect(validateAndNormalizeEmail("   ").ok).toBe(false);
      expect(validateAndNormalizeEmail(null).ok).toBe(false);
      expect(validateAndNormalizeEmail(undefined).ok).toBe(false);
    });

    it("rejects malformed email formats", () => {
      const invalid = [
        "plainaddress",
        "@missingusername.com",
        "missingatsign.com",
        "two@@signs.com",
        "space in@email.com",
      ];
      for (const email of invalid) {
        const result = validateAndNormalizeEmail(email);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("INVALID_CANDIDATE_EMAIL");
        }
      }
    });
  });

  describe("normalizePhoneSafe", () => {
    it("conservatively extracts digits for normalized phone while preserving raw phone", () => {
      const result = normalizePhoneSafe("  +1 (555) 234-5678  ");
      expect(result.raw).toBe("+1 (555) 234-5678");
      expect(result.normalized).toBe("15552345678");
    });

    it("returns null for raw and normalized when given empty or whitespace-only strings", () => {
      expect(normalizePhoneSafe("")).toEqual({ raw: null, normalized: null });
      expect(normalizePhoneSafe("   ")).toEqual({ raw: null, normalized: null });
      expect(normalizePhoneSafe(null)).toEqual({ raw: null, normalized: null });
      expect(normalizePhoneSafe(undefined)).toEqual({
        raw: null,
        normalized: null,
      });
    });

    it("returns null normalized phone when input contains zero digits", () => {
      const result = normalizePhoneSafe("N/A");
      expect(result.raw).toBe("N/A");
      expect(result.normalized).toBeNull();
    });
  });

  describe("validateCandidateName", () => {
    it("validates firstName and computes full name from firstName and lastName", () => {
      const result = validateCandidateName("  Elena  ", "  Reyes  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.firstName).toBe("Elena");
        expect(result.value.lastName).toBe("Reyes");
        expect(result.value.name).toBe("Elena Reyes");
      }
    });

    it("uses firstName as name when lastName is missing or empty", () => {
      const result = validateCandidateName("Elena", "  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.firstName).toBe("Elena");
        expect(result.value.lastName).toBeNull();
        expect(result.value.name).toBe("Elena");
      }
    });

    it("respects explicit name override if provided", () => {
      const result = validateCandidateName(
        "Elena",
        "Reyes",
        "Dr. Elena Reyes"
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("Dr. Elena Reyes");
      }
    });

    it("fails when firstName is empty, whitespace, or invalid", () => {
      expect(validateCandidateName("").ok).toBe(false);
      expect(validateCandidateName("   ").ok).toBe(false);
      expect(validateCandidateName(null).ok).toBe(false);
    });
  });

  describe("validateProvenanceInput", () => {
    it("validates non-empty source and channel", () => {
      const result = validateProvenanceInput({
        source: "  LinkedIn  ",
        channel: "  Job Board  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.source).toBe("LinkedIn");
        expect(result.value.channel).toBe("Job Board");
      }
    });

    it("fails when source or channel is missing or empty", () => {
      expect(validateProvenanceInput(null).ok).toBe(false);
      expect(validateProvenanceInput({ source: "Web", channel: "" }).ok).toBe(
        false
      );
      expect(validateProvenanceInput({ source: "", channel: "Direct" }).ok).toBe(
        false
      );
    });
  });

  describe("validatePrivacyAckInput", () => {
    it("returns null when acknowledgment is not provided (optional)", () => {
      expect(validatePrivacyAckInput(undefined)).toEqual({
        ok: true,
        value: null,
      });
      expect(validatePrivacyAckInput(null)).toEqual({
        ok: true,
        value: null,
      });
    });

    it("validates policyVersionId when acknowledgment is provided", () => {
      const result = validatePrivacyAckInput({
        policyVersionId: "  pv-12345  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.policyVersionId).toBe("pv-12345");
      }
    });

    it("fails when policyVersionId is empty or not a string", () => {
      expect(validatePrivacyAckInput({ policyVersionId: "" }).ok).toBe(false);
      expect(validatePrivacyAckInput({ policyVersionId: "   " }).ok).toBe(false);
      expect(validatePrivacyAckInput({ policyVersionId: 123 }).ok).toBe(false);
    });
  });
});
