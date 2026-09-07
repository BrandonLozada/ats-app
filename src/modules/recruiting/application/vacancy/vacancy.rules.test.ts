import { describe, it, expect } from "vitest";
import {
  validateVacancyTitle,
  validateVacancySlug,
  validateVacancyHeadcountAndLocations,
} from "./vacancy.rules";

describe("Vacancy Pure Rules — Title & Slug", () => {
  it("accepts valid trimmed title", () => {
    const res = validateVacancyTitle("  Enfermera General  ");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe("Enfermera General");
    }
  });

  it.each(["", "   ", "\t\n"])("rejects blank title: %j", (title) => {
    const res = validateVacancyTitle(title);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_VACANCY_TITLE");
    }
  });

  it("accepts valid trimmed slug", () => {
    const res = validateVacancySlug("  enfermera-general  ");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe("enfermera-general");
    }
  });

  it.each(["", "   ", "\t\n"])("rejects blank slug: %j", (slug) => {
    const res = validateVacancySlug(slug);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_VACANCY_SLUG");
    }
  });
});

describe("Vacancy Pure Rules — Headcount & Location Allocations", () => {
  const loc1 = "loc-1";
  const loc2 = "loc-2";

  it("accepts valid single-location allocation", () => {
    const res = validateVacancyHeadcountAndLocations(3, [
      { locationId: loc1, openings: 3 },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.openings).toBe(3);
      expect(res.value.locations).toHaveLength(1);
    }
  });

  it("accepts valid multi-location allocation", () => {
    const res = validateVacancyHeadcountAndLocations(5, [
      { locationId: loc1, openings: 3 },
      { locationId: loc2, openings: 2 },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.openings).toBe(5);
      expect(res.value.locations).toHaveLength(2);
    }
  });

  it.each([0, -1, -10, 1.5, NaN, Infinity])(
    "rejects invalid Vacancy openings: %j",
    (openings) => {
      const res = validateVacancyHeadcountAndLocations(openings as number, [
        { locationId: loc1, openings: 1 },
      ]);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_VACANCY_OPENINGS");
      }
    }
  );

  it("rejects empty locations array", () => {
    const res = validateVacancyHeadcountAndLocations(1, []);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VACANCY_LOCATION_REQUIRED");
    }
  });

  it.each(["", "   "])("rejects blank locationId: %j", (blankLoc) => {
    const res = validateVacancyHeadcountAndLocations(1, [
      { locationId: blankLoc, openings: 1 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VACANCY_LOCATION_REQUIRED");
    }
  });

  it.each([0, -1, -5, 2.5, NaN, Infinity])(
    "rejects invalid location openings: %j",
    (locOpenings) => {
      const res = validateVacancyHeadcountAndLocations(5, [
        { locationId: loc1, openings: locOpenings as number },
        { locationId: loc2, openings: 2 },
      ]);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_VACANCY_LOCATION_OPENINGS");
      }
    }
  );

  it("rejects duplicate location IDs", () => {
    const res = validateVacancyHeadcountAndLocations(4, [
      { locationId: loc1, openings: 2 },
      { locationId: loc1, openings: 2 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("DUPLICATE_VACANCY_LOCATION");
    }
  });

  it("rejects when sum of location openings is smaller than Vacancy openings", () => {
    const res = validateVacancyHeadcountAndLocations(5, [
      { locationId: loc1, openings: 2 },
      { locationId: loc2, openings: 2 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VACANCY_LOCATION_ALLOCATION_MISMATCH");
    }
  });

  it("rejects when sum of location openings is larger than Vacancy openings", () => {
    const res = validateVacancyHeadcountAndLocations(5, [
      { locationId: loc1, openings: 3 },
      { locationId: loc2, openings: 3 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VACANCY_LOCATION_ALLOCATION_MISMATCH");
    }
  });
});
