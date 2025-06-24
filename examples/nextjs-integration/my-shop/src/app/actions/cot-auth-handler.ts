"use server";

import { getCotClient } from "@/libs/cot-client";
import {
  CookieHandlerInterface,
} from "@trustedshops-public/cot-integration-library";
import { cookies } from "next/headers";

export async function cotAuthHandler(code: string | null, redirectUri: string) {
  const cotClient = await getCotClient();
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
  cotClient.setRedirectUri(redirectUri);

  await cotClient.handleCallback(code ?? "");
}
