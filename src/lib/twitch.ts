import { config } from "../lib/config.ts";

import { AppTokenAuthProvider } from 'npm:@twurple/auth';
import { ApiClient } from 'npm:@twurple/api';

export class Twitch {
  client: ApiClient;
  private readonly authProvider: AppTokenAuthProvider;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    if (!this.clientId || this.clientId === "null" || !this.clientSecret || this.clientSecret === "null") {
      throw new Error("Twitch client ID and/or client secret cannot be null, undefined, or empty.");
    }

    this.authProvider = new AppTokenAuthProvider(this.clientId, this.clientSecret);
    this.client = new ApiClient({ authProvider: this.authProvider });
  }

  public static getClientId() {
    const clientId = config.get<string>("twitch_client_id");
    return clientId ?? "null";
  }

  public static getClientSecret() {
    const clientSecret = config.get<string>("twitch_client_secret");
    return clientSecret ?? "null";
  }
}