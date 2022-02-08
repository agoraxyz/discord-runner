/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import cluster from "cluster";
import os from "os";
import { Intents, MessageComponentInteraction } from "discord.js";
import { Client } from "discordx";
import { InviteData } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import app from "./api/app";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  public static inviteDataCache: Map<string, InviteData>;

  static start(): void {
    this._client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
      ],
      classes: [`${__dirname}/discords/*.{js,ts}`],
      partials: ["CHANNEL"],
    });

    this._client.on("ready", async () => {
      logger.info(">> Bot started");

      await this._client.initApplicationCommands();
      await this._client.initApplicationPermissions();
    });

    this._client.on("messageCreate", (message) => {
      if (!message.author.bot) {
        this._client.executeCommand(message);
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

    this._client.login(config.discordToken);

    this.inviteDataCache = new Map();
  }
}

if (config.nodeEnv === "production") {
  const totalCPUs = os.cpus().length - 1;
  if (cluster.isMaster) {
    logger.info(`${totalCPUs} CPUs will be used.`);
    logger.info(`Master ${process.pid} is running`);

    for (let i = 0; i < totalCPUs; i += 1) {
      cluster.fork();
    }

    cluster.on("exit", (worker) => {
      logger.info(`worker ${worker.process.pid} died`);
      cluster.fork();
    });
    Main.start();
  } else {
    logger.info(`Worker ${process.pid} started`);

    app.listen(config.api.port, () => {
      logger.info(
        `Worker ${process.pid} is listening on http://localhost:${config.api.port}`
      );
    });
  }
} else {
  app.listen(config.api.port, () => {
    logger.info(`App is listening on http://localhost:${config.api.port}`);
  });
  Main.start();
}

export default Main;
