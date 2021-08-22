/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Client } from "@typeit/discord";
import api from "./api/api";
import { InviteData } from "./api/types";
import config from "./config";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  public static inviteDataCache: Map<string, InviteData>;

  static start(): void {
    api();

    this._client = new Client();
    this._client.login(
      config.discordToken,
      `${__dirname}/*.ts`,
      `${__dirname}/*.js`
    );

    this.inviteDataCache = new Map();
  }
}

Main.start();

export default Main;
