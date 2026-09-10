export type PrivacyPolicyResolutionError =
  | {
      readonly code: "PRIVACY_POLICY_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "PRIVACY_POLICY_CONFIGURATION_ERROR";
      readonly message: string;
    }
  | {
      readonly code: "PRIVACY_POLICY_READ_ERROR";
      readonly message: string;
    };
