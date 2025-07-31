import { getCotClient } from "@/libs/cot-client";

export async function GET(request: Request) {
  const cotClient = await getCotClient();
  cotClient.setRedirectUri(request.url);

  const user = await cotClient.getConsumerData();

  return new Response(JSON.stringify(user), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
