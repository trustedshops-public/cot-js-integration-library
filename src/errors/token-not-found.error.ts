export class TokenNotFoundError extends Error {
  constructor(message: string = "Unexpected error", cause?: Error) {
    super(message);
    this.name = "TokenNotFound";
    this.cause = cause;
  }
}
