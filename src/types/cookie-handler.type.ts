export interface CookieHandlerInterface {
  get(key: string): Promise<string | undefined>;

  set(key: string, value: string, expireDatetime?: Date): Promise<void>;

  remove(key: string): Promise<void>;
}
