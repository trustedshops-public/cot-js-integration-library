import { createHash, randomBytes } from "node:crypto";

const generateCodeVerifier = (): string => {
  return btoa(String.fromCharCode(...randomBytes(32)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = createHash("sha256").update(data).digest();
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export { generateCodeVerifier, generateCodeChallenge };
