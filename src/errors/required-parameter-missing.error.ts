export class RequiredParameterMissingError extends Error {
  constructor(message: string = "Unexpected error", cause?: Error) {
    super(message);
    this.name = "RequiredParameterMissing";
    this.cause = cause;
  }
}
