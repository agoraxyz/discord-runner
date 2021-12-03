/* eslint-disable class-methods-use-this */
import { User } from "discord.js";
import {
  Discord,
  Guard,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import { ping, status } from "../commands";
import NotABot from "../guards/NotABot";
import NotDM from "../guards/NotDM";
import Main from "../Main";
import { getGuildsOfServer } from "../service";
import logger from "../utils/logger";
import {
  createJoinInteractionPayload,
  getUserDiscordId,
  getUserHash,
} from "../utils/utils";

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
  @Guard(NotDM, NotABot)
  async join(command: SimpleCommandMessage): Promise<void> {
    logger.verbose(
      `${command.prefix}join command was used by ${command.message.author.username}#${command.message.author.discriminator}`
    );

    const guild = (await getGuildsOfServer(command.message.guildId))[0];
    const payload = createJoinInteractionPayload(guild, null, null);
    await command.message.reply(payload);
  }
}

export default SimpleCommands;
