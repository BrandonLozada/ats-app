export class ApplicationAlreadyExistsError extends Error {
  constructor() {
    super("Application already exists for this candidate and job posting");
  }
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
  }
}

export class InvalidStageTransitionError extends Error {
  constructor() {
    super("Invalid stage transition");
  }
}
