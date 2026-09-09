export type CandidateError =
  | {
      readonly code: "FORBIDDEN";
      readonly message: string;
    }
  | {
      readonly code: "CANDIDATE_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_CANDIDATE_EMAIL";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_CANDIDATE_INPUT";
      readonly message: string;
    }
  | {
      readonly code: "AUTH_USER_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "CANDIDATE_ALREADY_CLAIMED_BY_USER";
      readonly message: string;
    }
  | {
      readonly code: "PRIVACY_POLICY_VERSION_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "REPOSITORY_ERROR";
      readonly message: string;
    };
