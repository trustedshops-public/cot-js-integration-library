export interface CookieStorageInterface {
  get(key: string): string | null;

  set(key: string, value: string, expireDatetime?: Date): void;

  remove(key: string): void;
}
