export class TokenNotFoundError extends Error {
  constructor(
    message: string = "Unexpected error",
    public code: number = 0,
    public previous?: Error
  ) {
    super(message);
    this.name = "TokenNotFound";
    if (previous) {
      this.stack += "\nCaused by: " + previous.stack;
    }
  }
}
