import * as jose from "jose";
import NodeCache from "node-cache";
import { Logger } from "winston";
import { RequiredParameterMissingError } from "./errors/required-parameter-missing.error";
import { AuthStorageInterface } from "./types/auth-storage.type";
import { ActionType } from "./types/action.type";
import { CotToken } from "./types/cot-token.type";

import {
  TokenNotFoundError,
  TokenInvalidError,
  UnexpectedError,
} from "./errors";
import httpClient from "./libs/http-client.module";
import { CookieHandlerInterface } from "./types/cookie-handler.type";
import { TokenErrorResponse, TokenResponse } from "./types/token-response.type";
import { decryptValue, encryptValue } from "./utils/encryption.util";
import { generateCodeChallenge, generateCodeVerifier } from "./utils/pkce.util";
import { AnonymousConsumerData } from "./types/anonymous-consumer-data.type";

const ENV_URIS = {
  authServerBaseUri: {
    dev: "https://auth-integr.trustedshops.com/auth/realms/myTS-DEV/protocol/openid-connect",
    test: "https://auth-qa.trustedshops.com/auth/realms/myTS-QA/protocol/openid-connect",
    prod: "https://auth.trustedshops.com/auth/realms/myTS/protocol/openid-connect",
  },
  resourceServerBaseUri: {
    dev: "https://scoped-cns-data.consumer-account-dev.trustedshops.com/api/v1",
    test: "https://scoped-cns-data.consumer-account-test.trustedshops.com/api/v1",
    prod: "https://scoped-cns-data.consumer-account.trustedshops.com/api/v1",
  },
};

const IDENTITY_COOKIE_KEY = "TRSTD_ID_TOKEN";
const CODE_VERIFIER_COOKIE_KEY = "TRSTD_CV";
const CODE_CHALLENGE_COOKIE_KEY = "TRSTD_CC";

const CONSUMER_ANONYMOUS_DATA_CACHE_KEY = "CONSUMER_ANONYMOUS_DATA_";
const CONSUMER_ANONYMOUS_DATA_CACHE_TTL = 3600; // 1 hour

export class Client {
  private authServerBaseUri: string;
  private resourceServerBaseUri: string;
  private tsId: string;
  private clientId: string;
  private clientSecret: string;
  private authStorage: AuthStorageInterface;
  private cookieHandler?: CookieHandlerInterface;
  private logger: Logger | null = null;
  private cache: NodeCache;
  private jwks;

  constructor(
    tsId: string,
    clientId: string,
    clientSecret: string,
    authStorage: AuthStorageInterface,
    env: "dev" | "test" | "prod" = "prod"
  ) {
    if (!tsId) {
      throw new RequiredParameterMissingError("TS ID is required.");
    }

    if (!clientId) {
      throw new RequiredParameterMissingError("Client ID is required.");
    }

    if (!clientSecret) {
      throw new RequiredParameterMissingError("Client Secret is required.");
    }

    if (!authStorage) {
      throw new RequiredParameterMissingError("AuthStorage is required.");
    }

    this.tsId = tsId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.authStorage = authStorage;
    this.authServerBaseUri = ENV_URIS.authServerBaseUri[env];
    this.resourceServerBaseUri = ENV_URIS.resourceServerBaseUri[env];
    this.cache = new NodeCache();
    this.jwks = jose.createRemoteJWKSet(
      new URL(`${this.authServerBaseUri}/certs`)
    );
  }

  public async handleCallback(
    code?: string,
    cotAction?: ActionType
  ): Promise<void> {
    if (code) {
      await this.handleAuthCode(code);
    } else if (cotAction) {
      this.handleAction(cotAction as ActionType);
    }

    await this.refreshPKCE(false);
  }

  public async getAnonymousConsumerData(): Promise<AnonymousConsumerData | null> {
    try {
      const idToken = this.getIdentityCookie();
      if (!idToken) {
        return null;
      }

      const accessToken = await this.getOrRefreshAccessToken(idToken);
      const decodedToken = await this.decodeToken(idToken, false);

      const cacheKey = `${CONSUMER_ANONYMOUS_DATA_CACHE_KEY}${decodedToken.ctc_id}`;
      const cachedConsumerAnonymousDataItem =
        this.cache.get<AnonymousConsumerData>(cacheKey);

      if (cachedConsumerAnonymousDataItem) {
        return cachedConsumerAnonymousDataItem;
      }

      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${accessToken}`);

      const consumerAnonymousData = await httpClient.get<AnonymousConsumerData>(
        `${this.resourceServerBaseUri}/anonymous-data${
          this.tsId ? `?shopId=${this.tsId}` : ""
        }`,
        headers
      );

      this.cache.set(cacheKey, consumerAnonymousData);
      this.cache.ttl(cacheKey, CONSUMER_ANONYMOUS_DATA_CACHE_TTL);

      return consumerAnonymousData;
    } catch (error) {
      if (error instanceof Error) {
        this.logger?.error(error?.message);
      }
      return null;
    }
  }

  public setCookieHandler(cookieHandler: CookieHandlerInterface) {
    if (!cookieHandler) {
      throw new RequiredParameterMissingError("CookieHandler is required.");
    }

    this.cookieHandler = cookieHandler;
  }

  public setLogger(logger: Logger): void {
    this.logger = logger;
  }

  private async connect(code: string): Promise<CotToken | null> {
    const token = await this.getToken(code);
    if (!token) {
      return null;
    }

    await this.refreshPKCE(true);
    this.setTokenOnStorage(token);

    return token;
  }

  private async disconnect(): Promise<void> {
    const idToken = this.getIdentityCookie();
    if (idToken) {
      const decodedToken = await this.decodeToken(idToken, false);
      this.authStorage.remove(decodedToken.ctc_id);
      this.removeIdentityCookie();
    }
  }

  private async getToken(code: string): Promise<CotToken | null> {
    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const data = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: "https://localhost:5174/", // TODO get current url as redirect uri
      code: code,
      code_verifier: this.getCodeVerifierCookie() || "",
    });

    const tokenResponse = await httpClient.post<
      TokenResponse & TokenErrorResponse,
      URLSearchParams
    >(`${this.authServerBaseUri}/token`, data, headers);

    if (!tokenResponse || tokenResponse.error) {
      return null;
    }

    return new CotToken(
      tokenResponse.id_token,
      tokenResponse.refresh_token,
      tokenResponse.access_token
    );
  }

  private async getRefreshedToken(
    refreshToken: string
  ): Promise<CotToken | null> {
    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const data = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const responseJson = await httpClient.post<
      TokenResponse & TokenErrorResponse,
      URLSearchParams
    >(`${this.authServerBaseUri}/token`, data, headers);

    if (!responseJson || responseJson.error) {
      return null;
    }

    return new CotToken(
      responseJson.id_token,
      responseJson.refresh_token,
      responseJson.access_token
    );
  }

  private async getOrRefreshAccessToken(
    idToken: string
  ): Promise<string | undefined> {
    const token = await this.getTokenFromStorage(idToken);

    if (token) {
      let shouldRefresh = false;

      try {
        if (token.accessToken) {
          this.logger?.debug("access token is in storage. verifying...");
          await this.decodeToken(token.accessToken);
        } else {
          this.logger?.debug("access token cannot be found. refreshing...");
          shouldRefresh = true;
        }
      } catch (error) {
        if (error instanceof jose.errors.JWTExpired) {
          this.logger?.debug("access token is expired. refreshing...");
          shouldRefresh = true;
        } else {
          if (error instanceof Error) {
            this.logger?.error(error.message);
          }
          throw new UnexpectedError(
            `Unexpected error occurred: ${JSON.stringify(error)}`,
            error
          );
        }
      }

      if (shouldRefresh) {
        try {
          const refreshedToken = await this.getRefreshedToken(
            token.refreshToken
          );

          if (!refreshedToken) {
            throw new TokenNotFoundError(
              "A valid token cannot be found in storage. Authentication is required."
            );
          }

          token.accessToken = refreshedToken.accessToken;
          this.setTokenOnStorage(refreshedToken);
          this.logger?.debug("Access token is refreshed. returning...");

          return token.accessToken;
        } catch (error) {
          if (error instanceof Error) {
            this.logger?.debug(
              `Error occurred while refreshing the token: ${error.message}`
            );
          }
          this.removeIdentityCookie();
          throw error;
        }
      }

      this.logger?.debug("Access token is valid. returning...");
      return token.accessToken;
    }

    throw new TokenNotFoundError(
      "A valid token cannot be found in storage. Authentication is required."
    );
  }

  private async setTokenOnStorage(token: CotToken): Promise<void> {
    try {
      const decodedToken = await this.decodeToken(token.idToken, false);
      this.authStorage.set(decodedToken.ctc_id, token);
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        this.logger?.debug("id token is expired. returning...");
      } else {
        if (error instanceof Error) {
          this.logger?.error(error.message);
        }
        throw new UnexpectedError(
          `Unexpected error occurred.: ${JSON.stringify(error)}`,
          error
        );
      }
    }
  }

  private async getTokenFromStorage(idToken: string): Promise<CotToken | null> {
    try {
      const decodedToken = await this.decodeToken(idToken, false);
      return this.authStorage.get(decodedToken.ctc_id);
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        this.logger?.debug("id token is expired. returning...");
      } else {
        if (error instanceof Error) {
          this.logger?.error(error.message);
        }
        throw new UnexpectedError(
          `Unexpected error occurred: ${JSON.stringify(error)}`,
          error
        );
      }
    }

    return null;
  }

  private async decodeToken(token: string, validateExp = true) {
    if (!token) {
      throw new TokenInvalidError("Token cannot be empty or null.");
    }

    if (!validateExp) {
      const tks = token.split(".");
      return JSON.parse(Buffer.from(tks[1], "base64").toString("utf-8"));
    }

    return await jose.jwtVerify(token, this.jwks);
  }

  private async handleAuthCode(code: string): Promise<void> {
    const token = await this.connect(code);

    if (token) {
      this.setIdentityCookie(token.idToken);
    }
  }

  private handleAction(actionType: ActionType): void {
    if (actionType === "disconnect") {
      this.disconnect();
    }
  }

  private getIdentityCookie(): string | null {
    return this.cookieHandler?.get(IDENTITY_COOKIE_KEY) || null;
  }

  private setIdentityCookie(idToken: string): void {
    this.cookieHandler?.set(
      IDENTITY_COOKIE_KEY,
      idToken,
      new Date(Date.now() + 31536000000)
    );
  }

  private removeIdentityCookie(): void {
    this.cookieHandler?.remove(IDENTITY_COOKIE_KEY);
  }

  private setCodeVerifierAndChallengeCookie(
    codeVerifier: string,
    codeChallenge: string
  ): void {
    const encryptedCodeVerifier = encryptValue(this.clientSecret, codeVerifier);
    this.cookieHandler?.set(CODE_VERIFIER_COOKIE_KEY, encryptedCodeVerifier);
    this.cookieHandler?.set(CODE_CHALLENGE_COOKIE_KEY, codeChallenge);
  }

  private async refreshPKCE(force = false): Promise<void> {
    const codeVerifierCookie = this.cookieHandler?.get(
      CODE_VERIFIER_COOKIE_KEY
    );
    const codeChallengeCookie = this.cookieHandler?.get(
      CODE_CHALLENGE_COOKIE_KEY
    );

    if (force || !codeVerifierCookie || !codeChallengeCookie) {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      this.setCodeVerifierAndChallengeCookie(codeVerifier, codeChallenge);
    }
  }

  private getCodeVerifierCookie(): string | null {
    const encryptedCodeVerifier = this.cookieHandler?.get(
      CODE_VERIFIER_COOKIE_KEY
    );

    if (encryptedCodeVerifier) {
      return decryptValue(this.clientSecret, encryptedCodeVerifier);
    }

    return null;
  }
}
