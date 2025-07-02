import { CotToken } from "./cot-token.type";

export interface AuthStorageInterface {
  /**
   * @param sub Subject ID
   * @return CotToken|null
   */
  get(sub: string): Promise<CotToken | null>;

  /**
   * @param sub Subject ID
   * @param token CotToken object
   * @return void
   */
  set(sub: string, token: CotToken): Promise<void>;

  /**
   * @param sub Subject ID
   * @return void
   */
  remove(sub: string): Promise<void>;
}
