export class CotToken {
  idToken: string;
  refreshToken: string;
  accessToken?: string;

  constructor(idToken: string, refreshToken: string, accessToken?: string) {
    this.idToken = idToken;
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;
  }
}
