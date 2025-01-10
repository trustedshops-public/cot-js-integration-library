export class TokenInvalidError extends Error {
  constructor(message: string = "Unexpected error", cause?: Error) {
    super(message);
    this.name = "TokenInvalid";
    this.cause = cause;
  }
}
