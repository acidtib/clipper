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

    this.authProvider = new AppTokenAuthProvider(this.clientId, this.clientSecret);
    this.client = new ApiClient({ authProvider: this.authProvider });
  }

//   public async getClip(clipId: string): Promise<any> {
//     return this.client.getClip(clipId);
//   }

//   public async getUser
}