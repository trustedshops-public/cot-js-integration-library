import { generateCodeVerifier, generateCodeChallenge } from "./pkce.util";

describe("generateCodeVerifier", () => {
  test("should return a non-empty string", () => {
    const codeVerifier = generateCodeVerifier();
    expect(codeVerifier).toBeDefined();
    expect(codeVerifier.length).toBeGreaterThan(0);
  });

  test("should return a string of the expected length", () => {
    const codeVerifier = generateCodeVerifier();
    expect(codeVerifier.length).toBe(43);
  });
});

describe("generateCodeChallenge", () => {
  test("should return a non-empty string", async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    expect(codeChallenge).toBeDefined();
    expect(codeChallenge.length).toBeGreaterThan(0);
  });

  test("should return a valid base64 URL-encoded string", async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});
