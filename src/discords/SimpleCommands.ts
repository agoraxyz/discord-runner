/* eslint-disable class-methods-use-this */
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import logger from "../utils/logger";
import { guildStatusUpdate } from "../service";

@Discord()
abstract class SimpleCommands {
  static commands = ["ping", "status", "join"];

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
        "❌ You have to provide a guild-id.\nFor example: `!guild-status 123456789012345678`"
      );
      return;
    }

    await command.message.author.send(
      `I'll update the whole Guild accesses as soon as possible. \nGuildID: \`${guildId}\``
    );
    await guildStatusUpdate(guildId);
  }
}

export default SimpleCommands;
