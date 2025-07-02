import type {
  AuthStorageInterface,
  CotToken,
} from "@trustedshops-public/cot-integration-library";

export default class InMemoryAuthStorage implements AuthStorageInterface {
  private db: Record<string, CotToken> = {};

  constructor() {
    this.db = {};
  }

  async get(sub: string): Promise<CotToken | null> {
    return this.db[sub] || null;
  }

  async set(sub: string, token: CotToken): Promise<void> {
    this.db[sub] = token;
  }

  async remove(sub: string): Promise<void> {
    delete this.db[sub];
  }
}
