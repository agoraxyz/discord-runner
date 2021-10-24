/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Intents } from "discord.js";
import { Client } from "discordx";
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
      classes: [`${__dirname}/discords/*.{js,ts}`],
    });

    this._client.on("ready", async () => {
      logger.info(">> Bot started");

      await this._client.initApplicationCommands();
      await this._client.initApplicationPermissions();
    });

    this._client.on("interactionCreate", (interaction) => {
      this._client.executeInteraction(interaction);
    });

    this._client.login(config.discordToken);

    this.inviteDataCache = new Map();
  }
}

Main.start();

export default Main;
