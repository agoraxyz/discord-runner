/* eslint-disable class-methods-use-this */
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import { User } from "discord.js";
import { ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";
import { guildStatusUpdate } from "../service";

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
        "❌ You have to provide a guild-id.\nFor example: `!guild-status 123456789012345678`"
      );
      return;
    }

    await command.message.author.send(
      `I'll update the whole Guild accesses as soon as possible. \nGuildID: \`${guildId}\``
    );
    await guildStatusUpdate(guildId);
  }

  @SimpleCommand("status")
  async status(
    @SimpleCommandOption("userid") userIdParam: string,
    command: SimpleCommandMessage
  ) {
    if (command.message.deletable) {
      await command.message.delete();
    }

    let userId: string;
    let user: User;
    if (userIdParam) {
      userId = userIdParam;
    } else {
      userId = command.message.author.id;
    }

    try {
      user = await Main.Client.users.fetch(userId);
    } catch (error) {
      await command.message.author.send("Invalid userId.");
      return;
    }

    const embed = await status(user);
    await command.message.author.send({ embeds: [embed] });
  }
}

export default SimpleCommands;
