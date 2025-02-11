export interface TokenResponse {
  id_token: string;
  refresh_token: string;
  access_token?: string;
}

export interface TokenErrorResponse {
  error: string;
}
