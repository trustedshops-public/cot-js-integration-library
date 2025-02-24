import { CotToken } from "./cot-token.type";

export interface AuthStorageInterface {
  /**
   * @param ctcId CTC ID
   * @return CotToken|null
   */
  get(ctcId: string): Promise<CotToken | null>;

  /**
   * @param ctcId CTC ID
   * @param token CotToken object
   * @return void
   */
  set(ctcId: string, token: CotToken): Promise<void>;

  /**
   * @param ctcId CTC ID
   * @return void
   */
  remove(ctcId: string): Promise<void>;
}
