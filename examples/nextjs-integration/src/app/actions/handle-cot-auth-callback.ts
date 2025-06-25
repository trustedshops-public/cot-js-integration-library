"use server";

import { getCotClient } from "@/libs/cot-client";

export async function handleCotAuthCallback(
  redirectUri: string,
  code?: string,
) {
  const cotClient = await getCotClient();
  cotClient.setRedirectUri(redirectUri);

  await cotClient.handleCallback(code);
}
