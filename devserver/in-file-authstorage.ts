import { AuthStorageInterface } from "../src/types/auth-storage.type";
import { CotToken } from "../src/types/cot-token.type";
import fs from "fs";

export class InFileAuthStorage implements AuthStorageInterface {
  private filePath: string;

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

  get(ctcId: string): CotToken | null {
    const storage = this.readStorage();
    return storage[ctcId] || null;
  }

  set(ctcId: string, token: CotToken): void {
    const storage = this.readStorage();
    storage[ctcId] = token;
    this.writeStorage(storage);
  }

  remove(ctcId: string): void {
    const storage = this.readStorage();
    delete storage[ctcId];
    this.writeStorage(storage);
  }
}
