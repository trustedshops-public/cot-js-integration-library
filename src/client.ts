import jwt from "jsonwebtoken";
import * as jose from "jose";
import NodeCache from "node-cache";
import { Logger } from "winston";

import { TokenResponse } from "./types/token-response.type";
import { ClientConfig } from "./types/client-config.type";

class Client {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private environment: "dev" | "qa" | "prod";
  private logger: Logger | undefined;
  private jwksCache: NodeCache;
  private static ENV_URIS = {
    dev: "https://dev.api.trustedshops.com",
    qa: "https://qa.api.trustedshops.com",
    prod: "https://api.trustedshops.com",
  };

  constructor(config: ClientConfig) {
    const { clientId, clientSecret, redirectUri, environment, logger } = config;

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.environment = environment;
    this.logger = logger;
    this.jwksCache = new NodeCache({ stdTTL: 3600 });
  }

  private async fetchJSON(url: string, options: RequestInit): Promise<any> {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorBody}`);
    }
    return response.json();
  }

  async getToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    try {
      const url = `${Client.ENV_URIS[this.environment]}/oauth/token`;
      const body = JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await this.fetchJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      return response;
    } catch (error) {
      this.logger?.error("Error fetching token", error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const url = `${Client.ENV_URIS[this.environment]}/oauth/token`;
      const body = JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await this.fetchJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      return response;
    } catch (error) {
      this.logger?.error("Error refreshing token", error);
      throw error;
    }
  }

  async decodeToken(token: string): Promise<any> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === "string") {
        throw new Error("Invalid JWT token");
      }

      const jwks = await this.getJWKS();
      const key = jwks.get(decoded.header.kid);
      if (!key) {
        throw new Error("Key not found in JWKS");
      }

      return jwt.verify(token, key.toPEM(), { algorithms: ["RS256"] });
    } catch (error) {
      this.logger?.error("Error decoding token", error);
      throw error;
    }
  }

  private async getJWKS(): Promise<JWKS.KeyStore> {
    const cachedJWKS = this.jwksCache.get<JWKS.KeyStore>("jwks");
    if (cachedJWKS) {
      return cachedJWKS;
    }

    try {
      const url = `${Client.ENV_URIS[this.environment]}/.well-known/jwks.json`;
      const response = await this.fetchJSON(url, { method: "GET" });
      const jwks = jose.JWK.asKeyStore(response);
      this.jwksCache.set("jwks", jwks);
      return jwks;
    } catch (error) {
      this.logger?.error("Error fetching JWKS", error);
      throw error;
    }
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }
}

export default Client;
