/* eslint-disable class-methods-use-this */
import { User } from "discord.js";
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import { join, ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";
import { getUserDiscordId, getUserHash } from "../utils/utils";

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

  @SimpleCommand("status")
  async status(
    @SimpleCommandOption("userhash") userHashParam: string,
    command: SimpleCommandMessage
  ): Promise<void> {
    let userHash: string;
    let user: User;
    if (userHashParam) {
      userHash = userHashParam;
      const userId = await getUserDiscordId(userHash);
      user = await Main.Client.users.fetch(userId);
    } else {
      userHash = await getUserHash(command.message.author.id);
      user = command.message.author;
    }

    logger.verbose(
      `${command.prefix}status command was used by ${
        command.message.author.username
      }#${
        command.message.author.discriminator
      } -  targeted: ${!!userHashParam} userHash: ${userHash} userId: ${
        user.id
      }`
    );

    command.message
      .reply(
        `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)\nUser hash: \`${userHash}\``
      )
      .catch(logger.error);

    const embed = await status(user, userHash);
    command.message.reply({ embeds: [embed] }).catch(logger.error);
  }

  @SimpleCommand("join")
  async join(command: SimpleCommandMessage) {
    if (command.message.channel.type === "DM") {
      command.message.reply(
        "Use this command in a server to join all of its guilds you have access to!"
      );
      return;
    }

    logger.verbose(
      `${command.prefix}join command was used by ${command.message.author.username}#${command.message.author.discriminator}`
    );

    const message = await join(
      command.message.author.id,
      command.message.guild.id
    );

    command.message.reply(message);
  }
}

export default SimpleCommands;
