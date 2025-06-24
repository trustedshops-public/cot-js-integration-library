import {
  Client,
  CookieHandlerInterface,
} from "@trustedshops-public/cot-integration-library";
import { InFileAuthStorage } from "./in-file-authstorage";
import { cookies } from "next/headers";

const tsId = process.env.TS_ID ?? "";
const clientId = process.env.CLIENT_ID ?? "";
const clientSecret = process.env.CLIENT_SECRET ?? "";

const authStorage = new InFileAuthStorage("./auth-storage.json");

export async function getCotClient() {
  const cotClient = new Client(
    tsId,
    clientId,
    clientSecret,
    authStorage,
    "test"
  );
  const cookieStorage = await cookies();
  const cookieHandler: CookieHandlerInterface = {
    get: async (key: string) => {
      return cookieStorage.get(key)?.value;
    },
    set: async (key: string, value: string, expireDatetime?: Date) => {
      cookieStorage.set(key, value, {
        expires: expireDatetime,
        secure: true,
        sameSite: "strict",
      });
    },
    remove: async (key: string) => {
      cookieStorage.delete(key);
    },
  };
  cotClient.setCookieHandler(cookieHandler);

  return cotClient;
}
