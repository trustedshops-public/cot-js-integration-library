import type {
  AuthStorageInterface,
  CotToken,
} from "@trustedshops-public/cot-integration-library";

export default class InMemoryAuthStorage implements AuthStorageInterface {
  private db: Record<string, CotToken> = {};

  constructor() {
    this.db = {};
  }

  async get(ctcId: string): Promise<CotToken | null> {
    return this.db[ctcId] || null;
  }

  async set(ctcId: string, token: CotToken): Promise<void> {
    this.db[ctcId] = token;
  }

  async remove(ctcId: string): Promise<void> {
    delete this.db[ctcId];
  }
}
