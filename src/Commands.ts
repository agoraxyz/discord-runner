/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import config from "./config";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import logger from "./utils/logger";

@Discord(config.prefix)
abstract class Commands {
  static commands = ["ping"];

  @Command("ping")
  @Guard(NotABot)
  ping(command: CommandMessage): void {
    command
      .reply(
        `Latency is ${
          Date.now() - command.createdTimestamp
        }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
      )
      .catch(logger.error);
  }
}

export default Commands;
