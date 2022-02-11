/* eslint-disable class-methods-use-this */
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import { ping } from "../commands";
import { guildStatusUpdate } from "../service";
import logger from "../utils/logger";

@Discord()
abstract class SimpleCommands {
  static commands = ["ping", "status", "join"];

  @SimpleCommand("ping")
  ping(command: SimpleCommandMessage): void {
    logger.verbose(
      `${command.prefix}ping command was used by ${command.message.author.username}#${command.message.author.discriminator}`
    );
    command.message
      .reply(ping(command.message.createdTimestamp))
      .catch(logger.error);
  }

  @SimpleCommand("guild-status")
  async guildStatus(
    @SimpleCommandOption("guild-id") guildId: number,
    command: SimpleCommandMessage
  ) {
    logger.verbose(
      `${command.prefix}guild-status command was used by ${command.message.author.username}#${command.message.author.discriminator}`
    );

    if (!guildId) {
      await command.message.author.send(
        "You have to provide a guild-id.\nFor example: `!guild-id 123456789012345678`"
      );
    }

    await command.message.author.send(
      `I'll update the whole Guild accesses as soon as possible. \nGuildID: \`${guildId}\``
    );
    await guildStatusUpdate(guildId);
  }
}

export default SimpleCommands;
