export type VacancyError =
  | {
      readonly code: "FORBIDDEN";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_SLUG_ALREADY_EXISTS";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_VACANCY_TITLE";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_VACANCY_SLUG";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_VACANCY_OPENINGS";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_LOCATION_REQUIRED";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_VACANCY_LOCATION_OPENINGS";
      readonly message: string;
    }
  | {
      readonly code: "DUPLICATE_VACANCY_LOCATION";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_LOCATION_ALLOCATION_MISMATCH";
      readonly message: string;
    }
  | {
      readonly code: "DEPARTMENT_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "LEGAL_ENTITY_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "LOCATION_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_VERSION_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_VERSION_NOT_PUBLISHED";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_NOT_DRAFT";
      readonly message: string;
    }
  | {
      readonly code: "VACANCY_ALREADY_PUBLISHED";
      readonly message: string;
    };
