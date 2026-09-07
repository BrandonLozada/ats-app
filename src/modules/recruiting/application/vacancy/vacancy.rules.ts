import { Result, ok, err } from "@/platform/shared/result";
import { VacancyError } from "./vacancy.errors";

export function validateVacancyTitle(title: string): Result<string, VacancyError> {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) {
    return err({
      code: "INVALID_VACANCY_TITLE",
      message: "Vacancy title cannot be empty.",
    });
  }
  return ok(trimmed);
}

export function validateVacancySlug(slug: string): Result<string, VacancyError> {
  const trimmed = typeof slug === "string" ? slug.trim() : "";
  if (!trimmed) {
    return err({
      code: "INVALID_VACANCY_SLUG",
      message: "Vacancy slug cannot be empty.",
    });
  }
  return ok(trimmed);
}

export function validateVacancyHeadcountAndLocations(
  openings: number,
  locations: readonly { readonly locationId: string; readonly openings: number }[]
): Result<
  {
    readonly openings: number;
    readonly locations: readonly { readonly locationId: string; readonly openings: number }[];
  },
  VacancyError
> {
  // 1. Vacancy.openings must be an integer >= 1
  if (typeof openings !== "number" || !Number.isInteger(openings) || openings < 1) {
    return err({
      code: "INVALID_VACANCY_OPENINGS",
      message: `Vacancy openings must be an integer >= 1. Received: ${openings}.`,
    });
  }

  // 2. At least one location required
  if (!Array.isArray(locations) || locations.length === 0) {
    return err({
      code: "VACANCY_LOCATION_REQUIRED",
      message: "At least one location is required for a Vacancy.",
    });
  }

  // 3. Location uniqueness & individual openings validation
  const seenLocationIds = new Set<string>();
  let sumOpenings = 0;

  for (const loc of locations) {
    if (!loc.locationId || typeof loc.locationId !== "string" || !loc.locationId.trim()) {
      return err({
        code: "VACANCY_LOCATION_REQUIRED",
        message: "Location ID cannot be empty.",
      });
    }

    const trimmedLocId = loc.locationId.trim();
    if (seenLocationIds.has(trimmedLocId)) {
      return err({
        code: "DUPLICATE_VACANCY_LOCATION",
        message: `Duplicate location ID "${trimmedLocId}" in vacancy allocation.`,
      });
    }
    seenLocationIds.add(trimmedLocId);

    if (
      typeof loc.openings !== "number" ||
      !Number.isInteger(loc.openings) ||
      loc.openings < 1
    ) {
      return err({
        code: "INVALID_VACANCY_LOCATION_OPENINGS",
        message: `Vacancy location openings must be an integer >= 1. Received: ${loc.openings} for location "${trimmedLocId}".`,
      });
    }

    sumOpenings += loc.openings;
  }

  // 4. Strict allocation equality: SUM(VacancyLocation.openings) === Vacancy.openings
  if (sumOpenings !== openings) {
    return err({
      code: "VACANCY_LOCATION_ALLOCATION_MISMATCH",
      message: `Total vacancy openings (${openings}) does not match the sum of allocated location openings (${sumOpenings}).`,
    });
  }

  return ok({
    openings,
    locations,
  });
}
