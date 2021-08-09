/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Client } from "@typeit/discord";
import api from "./api/api";
import config from "./config";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  public static inviteCodeCache: Map<string, string>;

  static start(): void {
    api();

    this._client = new Client();
    this._client.login(
      config.discordToken,
      `${__dirname}/*.ts`,
      `${__dirname}/*.js`
    );

    this.inviteCodeCache = new Map();
  }
}

Main.start();

export default Main;
