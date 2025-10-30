import * as jose from "jose";
import NodeCache from "node-cache";
import { Logger } from "winston";
import { RequiredParameterMissingError } from "./errors/required-parameter-missing.error";
import { AuthStorageInterface } from "./types/auth-storage.type";
import { ActionType } from "./types/action.type";
import { CotToken } from "./types/cot-token.type";
import { Environments } from "./types/env.type";

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
import { ConsumerData } from "./types/consumer-data.type";

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

const CONSUMER_DATA_CACHE_KEY = "CONSUMER_DATA_";
const CONSUMER_DATA_CACHE_TTL = 3600; // 1 hour

export class Client {
  private readonly authServerBaseUri: string;
  private readonly resourceServerBaseUri: string;
  private readonly tsId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private redirectUri: string;
  private readonly authStorage: AuthStorageInterface;
  private cookieHandler?: CookieHandlerInterface;
  private logger: Logger | null = null;
  private readonly cache: NodeCache;
  private readonly jwks;

  constructor(
    clientId: string,
    clientSecret: string,
    authStorage: AuthStorageInterface,
    env?: Environments
  );
  constructor(
    tsId: string,
    clientId: string,
    clientSecret: string,
    authStorage: AuthStorageInterface,
    env?: Environments
  );
  constructor(
    tsIdOrClientId: string,
    clientIdOrSecret: string,
    clientSecretOrStorage: string | AuthStorageInterface,
    authStorageOrEnv: AuthStorageInterface | Environments = "prod",
    env: Environments = "prod"
  ) {
    const hasTsId = arguments.length === 5;

    const tsId = hasTsId ? tsIdOrClientId : "";
    const clientId = hasTsId ? clientIdOrSecret : tsIdOrClientId;
    const clientSecret = hasTsId ? clientSecretOrStorage as string : clientIdOrSecret;
    const authStorage = hasTsId ? authStorageOrEnv as AuthStorageInterface : clientSecretOrStorage as AuthStorageInterface;
    const environment = hasTsId ? env : authStorageOrEnv as Environments;

    if (hasTsId && !tsId) {
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
    this.authServerBaseUri = ENV_URIS.authServerBaseUri[environment];
    this.resourceServerBaseUri = ENV_URIS.resourceServerBaseUri[environment];
    this.redirectUri = "";
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
      await this.handleAction(cotAction as ActionType);
    }

    await this.refreshPKCE(false);
  }

  /**
   * Retrieves the access token for the current user.
   *
   * @returns {Promise<string | null>} The access token if available, otherwise null.
   */
  public async getAccessToken(): Promise<string | null> {
    try {
      const idToken = await this.getIdentityCookie();
      if (!idToken) {
        throw new TokenNotFoundError(
          "A valid ID token cannot be found in cookies. Authentication is required."
        );
      }
      return (await this.getOrRefreshAccessToken(idToken)) ?? null;
    } catch (error) {
      this.logger?.debug(
        `Error occurred while getting access token: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
    return null;
  }

  /**
   * Retrieves consumer data for the current user.
   *
   * @returns {Promise<ConsumerData | null>} The consumer data if available, otherwise null.
   */
  public async getConsumerData(): Promise<ConsumerData | null> {
    try {
      const idToken = await this.getIdentityCookie();
      if (!idToken) {
        return null;
      }

      const accessToken = await this.getOrRefreshAccessToken(idToken);
      const decodedToken = await this.decodeToken(idToken, false);

      const cacheKey = `${CONSUMER_DATA_CACHE_KEY}${decodedToken.sub}`;
      const cachedConsumerDataItem =
        this.cache.get<ConsumerData>(cacheKey);

      if (cachedConsumerDataItem) {
        return cachedConsumerDataItem;
      }

      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${accessToken}`);

      const consumerData = await httpClient.get<ConsumerData>(
        `${this.resourceServerBaseUri}/consumer-data${
          this.tsId ? `?shopId=${this.tsId}` : ""
        }`,
        headers
      );

      this.cache.set(cacheKey, consumerData);
      this.cache.ttl(cacheKey, CONSUMER_DATA_CACHE_TTL);

      return consumerData;
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

  public setRedirectUri(redirectUri: string): void {
    if (!redirectUri) {
      throw new RequiredParameterMissingError("Redirect URI is required.");
    }

    // Remove query parameters from the redirect URI
    this.redirectUri = redirectUri.split("?")[0];
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
    await this.setTokenOnStorage(token);

    return token;
  }

  private async disconnect(): Promise<void> {
    const idToken = await this.getIdentityCookie();
    if (idToken) {
      const decodedToken = await this.decodeToken(idToken, false);
      this.authStorage.remove(decodedToken.sub);
      this.removeIdentityCookie();
    }
  }

  private async getToken(code: string): Promise<CotToken | null> {
    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const codeVerifier = await this.getCodeVerifierCookie();
    const data = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code: code,
      code_verifier: codeVerifier || "",
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
          await this.setTokenOnStorage(refreshedToken);
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
      this.authStorage.set(decodedToken.sub, token);
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
      return this.authStorage.get(decodedToken.sub);
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
      await this.setIdentityCookie(token.idToken);
    }
  }

  private async handleAction(actionType: ActionType): Promise<void> {
    if (actionType === "disconnect") {
      await this.disconnect();
    }
  }

  private async getIdentityCookie(): Promise<string | null> {
    return (await this.cookieHandler?.get(IDENTITY_COOKIE_KEY)) || null;
  }

  private async setIdentityCookie(idToken: string): Promise<void> {
    await this.cookieHandler?.set(
      IDENTITY_COOKIE_KEY,
      idToken,
      new Date(Date.now() + 31536000000)
    );
  }

  private removeIdentityCookie(): void {
    this.cookieHandler?.remove(IDENTITY_COOKIE_KEY);
  }

  private async setCodeVerifierAndChallengeCookie(
    codeVerifier: string,
    codeChallenge: string
  ): Promise<void> {
    const encryptedCodeVerifier = encryptValue(this.clientSecret, codeVerifier);
    await this.cookieHandler?.set(
      CODE_VERIFIER_COOKIE_KEY,
      encryptedCodeVerifier
    );
    await this.cookieHandler?.set(CODE_CHALLENGE_COOKIE_KEY, codeChallenge);
  }

  private async refreshPKCE(force = false): Promise<void> {
    const codeVerifierCookie = await this.cookieHandler?.get(
      CODE_VERIFIER_COOKIE_KEY
    );
    const codeChallengeCookie = await this.cookieHandler?.get(
      CODE_CHALLENGE_COOKIE_KEY
    );

    if (force || !codeVerifierCookie || !codeChallengeCookie) {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      await this.setCodeVerifierAndChallengeCookie(codeVerifier, codeChallenge);
    }
  }

  private async getCodeVerifierCookie(): Promise<string | null> {
    const encryptedCodeVerifier = await this.cookieHandler?.get(
      CODE_VERIFIER_COOKIE_KEY
    );

    if (encryptedCodeVerifier) {
      return decryptValue(this.clientSecret, encryptedCodeVerifier);
    }

    return null;
  }
}
