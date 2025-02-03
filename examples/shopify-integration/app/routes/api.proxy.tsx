import type { ActionFunction, ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import "events";

import type { ActionType, CookieHandlerInterface } from '@trustedshops-public/cot-integration-library';
import { Client } from '@trustedshops-public/cot-integration-library';
import PrismaAuthStorage from "../cot/prisma-authstorage";

type PostAction = "getTokens" | "exchangeCode" | "getUserInfo";

const tsId = process.env.TS_ID || "";
const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

export const loader: LoaderFunction = async ({ request, params }) => {
  const { session, storefront } = await authenticate.public.appProxy(request);

  if (!session || !storefront) {
    return new Response("Unauthorized", { status: 401 });
  }

  return {};
}

export const action: ActionFunction = async ({ request, params }: ActionFunctionArgs) => {
  const { session, storefront } = await authenticate.public.appProxy(request);

  if (!session || !storefront) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json() as { action: string, code?: string, redirectUri?: string, cotAction: ActionType, cookies: Record<string, { value: string, expires: string }> };
  const cookies = body.cookies;
  const actionValue = body.action as PostAction;

  const cotClient = new Client(
    tsId,
    clientId,
    clientSecret,
    new PrismaAuthStorage(),
    "test"
  );

  if (cookies) {
    const cookieHandler: CookieHandlerInterface = {
      get: async (key: string) => {
        return cookies[key]?.value;
      },
      set: async (key: string, value: string, expireDatetime?: Date) => {
        cookies[key] = { value, expires: expireDatetime?.toUTCString() || "" };
      },
      async remove(key: string) {
        delete cookies[key];
      },
    }
    cotClient.setCookieHandler(cookieHandler);
    if (body.redirectUri) {
      cotClient.setRedirectUri(body.redirectUri);
    }
    await cotClient.handleCallback(body.code, body.cotAction);
  }

  if (actionValue === "getTokens" || actionValue === "exchangeCode") {
    return {
      cookies,
    }
  }

  if (actionValue === "getUserInfo") {
    return await cotClient.getAnonymousConsumerData();
  }

  throw new Error("Invalid action");
};
