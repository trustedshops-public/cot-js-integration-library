export class UnexpectedError extends Error {
  constructor(
    message: string = "Unexpected error",
    public code: number = 0,
    public previous?: Error
  ) {
    super(message);
    this.name = "UnexpectedError";
    if (previous) {
      this.stack += "\nCaused by: " + previous.stack;
    }
  }
}
