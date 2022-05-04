/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import axios from "axios";
import { importx } from "@discordx/importer";
import { Intents, MessageComponentInteraction } from "discord.js";
import { Client } from "discordx";
import api from "./api/api";
import { InviteData } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse } from "./utils/utils";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  public static inviteDataCache: Map<string, InviteData>;

  static async start(): Promise<void> {
    api();

    // log all axios responses
    axios.interceptors.response.use(logAxiosResponse);

    this._client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      ],
      partials: ["MESSAGE", "CHANNEL", "REACTION"],
      retryLimit: 3,
      // rejectOnRateLimit: ["/"],
      restGlobalRateLimit: 50,
    });

    this._client.on("ready", async () => {
      logger.info(">> Bot started");

      await this._client.initApplicationCommands();
      await this._client.initApplicationPermissions();
    });

    this._client.on("messageCreate", (message) => {
      try {
        if (!message.author.bot) {
          this._client.executeCommand(message);
        }
      } catch (error) {
        logger.error(`messageCreate error - ${error.message}`);
      }
    });

    this._client.on("interactionCreate", (interaction) => {
      if (
        interaction instanceof MessageComponentInteraction &&
        interaction.customId?.startsWith("discordx@pagination@")
      ) {
        return;
      }
      this._client.executeInteraction(interaction);
    });

    await importx(`${__dirname}/discords/*.{ts,js}`);

    this._client.login(config.discordToken);

    this.inviteDataCache = new Map();
  }
}

Main.start();

export default Main;
