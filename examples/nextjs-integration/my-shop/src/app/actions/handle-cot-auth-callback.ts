"use server";

import { getCotClient } from "@/libs/cot-client";

export async function handleCotAuthCallback(
  code: string | null,
  redirectUri: string
) {
  const cotClient = await getCotClient();
  cotClient.setRedirectUri(redirectUri);

  await cotClient.handleCallback(code ?? "");
}
