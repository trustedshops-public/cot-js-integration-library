import fs from "fs";
import {
  AuthStorageInterface,
  CotToken,
} from "@trustedshops-public/cot-integration-library";

export class InFileAuthStorage implements AuthStorageInterface {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }
  }

  private readStorage(): { [key: string]: CotToken } {
    const data = fs.readFileSync(this.filePath, "utf-8");
    return JSON.parse(data);
  }

  private writeStorage(storage: { [key: string]: CotToken }): void {
    fs.writeFileSync(this.filePath, JSON.stringify(storage, null, 2));
  }

  get(sub: string): Promise<CotToken | null> {
    const storage = this.readStorage();
    return Promise.resolve(storage[sub] || null);
  }

  set(sub: string, token: CotToken): Promise<void> {
    const storage = this.readStorage();
    storage[sub] = token;
    this.writeStorage(storage);
    return Promise.resolve();
  }

  remove(sub: string): Promise<void> {
    const storage = this.readStorage();
    delete storage[sub];
    this.writeStorage(storage);
    return Promise.resolve();
  }
}
