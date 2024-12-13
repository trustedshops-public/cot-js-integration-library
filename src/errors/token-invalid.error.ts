export class TokenInvalidError extends Error {
  constructor(
    message: string = "Unexpected error",
    public code: number = 0,
    public previous?: Error
  ) {
    super(message);
    this.name = "TokenInvalid";
    if (previous) {
      this.stack += "\nCaused by: " + previous.stack;
    }
  }
}
