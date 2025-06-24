import { Client } from "@trustedshops-public/cot-integration-library";
import { InFileAuthStorage } from "./in-file-authstorage";

const tsId = process.env.TS_ID ?? "";
const clientId = process.env.CLIENT_ID ?? "";
const clientSecret = process.env.CLIENT_SECRET ?? "";

const authStorage = new InFileAuthStorage("./auth-storage.json");

export async function getCotClient() {
  return new Client(tsId, clientId, clientSecret, authStorage, "test");
}
