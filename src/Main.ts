/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Client } from "@typeit/discord";
import { Intents } from "discord.js";
import api from "./api/api";
import { InviteData } from "./api/types";
import config from "./config";
import logger from "./utils/logger";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  public static inviteDataCache: Map<string, InviteData>;

  static start(): void {
    api();

    this._client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
      ],
      classes: [`${__dirname}/*.ts`, `${__dirname}/*.js`],
    });
    this._client.login(config.discordToken);

    this._client.once("ready", async () => {
      if (config.nodeEnv === "development") {
        await this._client.clearSlashes(config.testGuildId);
      } else {
        await this._client.clearSlashes();
      }
      await this._client.initSlashes();

      logger.info(
        `Updated slashes for ${
          config.nodeEnv === "development" ? config.testGuildId : "all servers"
        }.`
      );
    });

    this._client.on("interaction", (interaction) => {
      this._client.executeSlash(interaction);
    });

    this.inviteDataCache = new Map();
  }
}

Main.start();

export default Main;
