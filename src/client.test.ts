import { describe, it, expect, beforeEach, vi } from "vitest";
import { Client } from "./client";
import { AuthStorageInterface } from "./types/auth-storage.type";
import { CookieHandlerInterface } from "./types/cookie-handler.type";
import { TokenInvalidError } from "./errors/token-invalid.error";
import { CotToken } from "./types/cot-token.type";

// Helper to create a mock auth storage
const createMockAuthStorage = (): AuthStorageInterface => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
});

// Helper to create a mock cookie handler
const createMockCookieHandler = (): CookieHandlerInterface => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
});

// Helper to access private methods using bracket notation
const callPrivateMethod = (client: any, methodName: string, ...args: any[]) => {
  return client[methodName](...args);
};

describe("Client", () => {
  let client: Client;
  let mockAuthStorage: AuthStorageInterface;
  let mockCookieHandler: CookieHandlerInterface;

  beforeEach(() => {
    mockAuthStorage = createMockAuthStorage();
    mockCookieHandler = createMockCookieHandler();
    client = new Client("test-client-id", "test-client-secret", mockAuthStorage, "dev");
    client.setCookieHandler(mockCookieHandler);
  });

  describe("isValidJwtFormat", () => {
    it("should return true for a valid JWT format", () => {
      const validJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
      const result = callPrivateMethod(client, "isValidJwtFormat", validJwt);
      expect(result).toBe(true);
    });

    it("should return false for empty string", () => {
      const result = callPrivateMethod(client, "isValidJwtFormat", "");
      expect(result).toBe(false);
    });

    it("should return false for null", () => {
      const result = callPrivateMethod(client, "isValidJwtFormat", null);
      expect(result).toBe(false);
    });

    it("should return false for JWT with only 2 parts", () => {
      const invalidJwt = "header.payload";
      const result = callPrivateMethod(client, "isValidJwtFormat", invalidJwt);
      expect(result).toBe(false);
    });

    it("should return false for JWT with more than 3 parts", () => {
      const invalidJwt = "header.payload.signature.extra";
      const result = callPrivateMethod(client, "isValidJwtFormat", invalidJwt);
      expect(result).toBe(false);
    });

    it("should return false for JWT with empty payload", () => {
      const invalidJwt = "header..signature";
      const result = callPrivateMethod(client, "isValidJwtFormat", invalidJwt);
      expect(result).toBe(false);
    });

    it("should return false for JWT with whitespace-only payload", () => {
      const invalidJwt = "header.   .signature";
      const result = callPrivateMethod(client, "isValidJwtFormat", invalidJwt);
      expect(result).toBe(false);
    });

    it("should return false for non-string input", () => {
      const result = callPrivateMethod(client, "isValidJwtFormat", 12345);
      expect(result).toBe(false);
    });
  });

  describe("decodeToken", () => {
    it("should throw TokenInvalidError for empty token", async () => {
      await expect(
        callPrivateMethod(client, "decodeToken", "", false)
      ).rejects.toThrow(TokenInvalidError);
    });

    it("should throw TokenInvalidError for null token", async () => {
      await expect(
        callPrivateMethod(client, "decodeToken", null, false)
      ).rejects.toThrow(TokenInvalidError);
    });

    it("should throw TokenInvalidError for invalid JWT format (2 parts)", async () => {
      const invalidJwt = "header.payload";
      await expect(
        callPrivateMethod(client, "decodeToken", invalidJwt, false)
      ).rejects.toThrow(TokenInvalidError);
    });

    it("should throw TokenInvalidError for invalid JWT format (4 parts)", async () => {
      const invalidJwt = "header.payload.signature.extra";
      await expect(
        callPrivateMethod(client, "decodeToken", invalidJwt, false)
      ).rejects.toThrow(TokenInvalidError);
    });

    it("should throw TokenInvalidError for JWT with empty payload", async () => {
      const invalidJwt = "header..signature";
      await expect(
        callPrivateMethod(client, "decodeToken", invalidJwt, false)
      ).rejects.toThrow(TokenInvalidError);
    });

    it("should decode a valid JWT without validation", async () => {
      // Create a simple JWT with a valid payload
      const payload = { sub: "test-user", iat: Date.now() };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const validJwt = `header.${encodedPayload}.signature`;

      const result = await callPrivateMethod(client, "decodeToken", validJwt, false);
      expect(result.sub).toBe("test-user");
    });
  });

  describe("getIdentityCookie", () => {
    it("should return null when cookie handler returns null", async () => {
      vi.mocked(mockCookieHandler.get).mockResolvedValue(null);
      const result = await callPrivateMethod(client, "getIdentityCookie");
      expect(result).toBeNull();
    });

    it("should return null when cookie handler returns undefined", async () => {
      vi.mocked(mockCookieHandler.get).mockResolvedValue(undefined);
      const result = await callPrivateMethod(client, "getIdentityCookie");
      expect(result).toBeNull();
    });

    it("should return the token when cookie exists", async () => {
      const mockToken = "eyJhbGciOiJIUzI1NiJ9.payload.signature";
      vi.mocked(mockCookieHandler.get).mockResolvedValue(mockToken);
      const result = await callPrivateMethod(client, "getIdentityCookie");
      expect(result).toBe(mockToken);
    });
  });

  describe("setIdentityCookie", () => {
    it("should call cookie handler set with correct parameters", async () => {
      const mockToken = "test-token";
      await callPrivateMethod(client, "setIdentityCookie", mockToken);
      
      expect(mockCookieHandler.set).toHaveBeenCalledWith(
        "TRSTD_ID_TOKEN",
        mockToken,
        expect.any(Date)
      );
    });
  });

  describe("removeIdentityCookie", () => {
    it("should call cookie handler remove with correct key", () => {
      callPrivateMethod(client, "removeIdentityCookie");
      expect(mockCookieHandler.remove).toHaveBeenCalledWith("TRSTD_ID_TOKEN");
    });
  });

  describe("disconnect", () => {
    it("should handle TokenInvalidError gracefully", async () => {
      const invalidToken = "invalid.token";
      vi.mocked(mockCookieHandler.get).mockResolvedValue(invalidToken);

      // Should not throw and should remove cookie
      await expect(
        callPrivateMethod(client, "disconnect")
      ).resolves.not.toThrow();

      expect(mockCookieHandler.remove).toHaveBeenCalledWith("TRSTD_ID_TOKEN");
    });

    it("should remove token from storage and cookie for valid token", async () => {
      const payload = { sub: "test-user-123" };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const validToken = `header.${encodedPayload}.signature`;
      
      vi.mocked(mockCookieHandler.get).mockResolvedValue(validToken);

      await callPrivateMethod(client, "disconnect");

      expect(mockAuthStorage.remove).toHaveBeenCalledWith("test-user-123");
      expect(mockCookieHandler.remove).toHaveBeenCalledWith("TRSTD_ID_TOKEN");
    });

    it("should not attempt to remove if cookie is null", async () => {
      vi.mocked(mockCookieHandler.get).mockResolvedValue(null);

      await callPrivateMethod(client, "disconnect");

      expect(mockAuthStorage.remove).not.toHaveBeenCalled();
      expect(mockCookieHandler.remove).not.toHaveBeenCalled();
    });
  });

  describe("setTokenOnStorage", () => {
    it("should update identity cookie when setting tokens", async () => {
      const payload = { sub: "test-user-456", iat: Date.now() };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const idToken = `header.${encodedPayload}.signature`;
      
      const token = new CotToken(idToken, "refresh-token", "access-token");

      await callPrivateMethod(client, "setTokenOnStorage", token);

      // Verify both auth storage and cookie are updated
      expect(mockAuthStorage.set).toHaveBeenCalledWith("test-user-456", token);
      expect(mockCookieHandler.set).toHaveBeenCalledWith(
        "TRSTD_ID_TOKEN",
        idToken,
        expect.any(Date)
      );
    });

    it("should handle TokenInvalidError when setting invalid token", async () => {
      const invalidToken = new CotToken("invalid.token", "refresh", "access");

      await expect(
        callPrivateMethod(client, "setTokenOnStorage", invalidToken)
      ).rejects.toThrow();
    });
  });
});
