import { getCotClient } from "@/libs/cot-client";
import { CookieHandlerInterface } from "@trustedshops-public/cot-integration-library";
import { cookies } from "next/headers";

export async function GET(request: Request) {
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
  cotClient.setRedirectUri(request.url);

  const user = await cotClient.getAnonymousConsumerData();

  return new Response(JSON.stringify(user), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
