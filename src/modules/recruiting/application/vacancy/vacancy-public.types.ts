import type { EmploymentType } from "./vacancy.types";

export type PublicVacancyLocation = {
  readonly id: string;
  readonly name: string;
  readonly openings: number;
};

export type PublicVacancyDepartment = {
  readonly id: string;
  readonly name: string;
};

export type PublicVacancyLegalEntity = {
  readonly id: string;
  readonly name: string;
};

export type PublicVacancySummary = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly employmentType: EmploymentType | null;
  readonly isRemote: boolean;
  readonly openings: number;
  readonly publishedAt: Date | null;
  readonly department: PublicVacancyDepartment;
  readonly legalEntity: PublicVacancyLegalEntity;
  readonly locations: readonly PublicVacancyLocation[];
};

export type PublicVacancyDetails = PublicVacancySummary;

export type GetPublicVacancyDetailsInput = {
  readonly slug: string;
};
