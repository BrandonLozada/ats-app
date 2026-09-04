export type PipelineError =
  | {
      readonly code: "FORBIDDEN";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_VERSION_NOT_FOUND";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_NAME_ALREADY_EXISTS";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_DRAFT_ALREADY_EXISTS";
      readonly message: string;
    }
  | {
      readonly code: "PIPELINE_VERSION_IMMUTABLE";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_PIPELINE_STAGES";
      readonly message: string;
      readonly details?: readonly string[];
    };
