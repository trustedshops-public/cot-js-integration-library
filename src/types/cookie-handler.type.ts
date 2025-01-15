export interface CookieHandlerInterface {
  get(key: string): string | undefined;

  set(key: string, value: string, expireDatetime?: Date): void;

  remove(key: string): void;
}
