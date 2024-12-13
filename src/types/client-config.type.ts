import { Logger } from "winston";

export interface ClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "dev" | "qa" | "prod";
  logger?: Logger;
}
