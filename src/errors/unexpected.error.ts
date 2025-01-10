export class UnexpectedError extends Error {
  constructor(message: string = "Unexpected error", cause?: Error | unknown) {
    super(message);
    this.name = "UnexpectedError";
    this.cause = cause;
  }
}
