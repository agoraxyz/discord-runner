/* eslint-disable class-methods-use-this */
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import { ping } from "../commands";
import { getGuildsOfServer, guildStatusUpdate } from "../service";
import logger from "../utils/logger";
import { createJoinInteractionPayload } from "../utils/utils";

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
      return;
    }

    await command.message.author.send(
      `I'll update the whole Guild accesses as soon as possible. \nGuildID: \`${guildId}\``
    );
    await guildStatusUpdate(guildId);
  }

  @SimpleCommand("join-button")
  async joinButton(
    @SimpleCommandOption("message-text") messageText: string,
    @SimpleCommandOption("button-text") buttonText: string,
    command: SimpleCommandMessage
  ) {
    if (command.message.channel.type === "DM") {
      await command.message.channel.send(
        "Use this command in a server to spawn a join button!"
      );
      return;
    }

    await command.message.delete();

    if (command.message.guild.id === "886314998131982336") {
      await command.message.author.send(
        "You can't use this command in the Official Guild Server!"
      );
      return;
    }

    const guild = await getGuildsOfServer(command.message.guild.id);
    if (!guild) {
      await command.message.author.send("There are no guilds in this server.");
      return;
    }

    const payload = createJoinInteractionPayload(
      guild[0],
      messageText,
      buttonText.slice(0, 80)
    );

    await command.message.channel.send(payload);

    await command.message.author.send("Join button created successfully.");
  }
}

export default SimpleCommands;
