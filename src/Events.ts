/* eslint-disable class-methods-use-this */
import { Description, Guard, On } from "@typeit/discord";
import {
  GuildMember,
  Message,
  MessageEmbed,
  PartialGuildMember,
} from "discord.js";
import Commands from "./Commands";
import config from "./config";
import IsAPrivateMessage from "./Guards/IsAPrivateMessage";
import NotABot from "./Guards/NotABot";
import { userJoined, userRemoved } from "./service";
import logger from "./utils/logger";

@Description("Event listeners.")
abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
  }

  @On("message")
  @Guard(NotABot)
  @Guard(IsAPrivateMessage)
  onPrivateMessage(messages: [Message]): void {
    messages.forEach((message) => {
      if (
        !Commands.commands.some((command) =>
          message.content.match(`${config.prefix}${command}( .*)?`)
        )
      ) {
        logger.verbose(
          `unkown requst: ${message.author.username}#${message.author.discriminator}: ${message.content}`
        );
        const embed = new MessageEmbed({
          title: "I'm sorry, but I couldn't interpret your request.",
          color: config.embedColor,
          description:
            "You can find more information in our [gitbook](https://agoraspace.gitbook.io/agoraspace/try-our-tools) or on the [Agora](https://app.agora.space/) website.",
        });
        message.channel.send(embed).catch(logger.error);
      }
    });
  }

  @On("guildMemberAdd")
  onGuildMemberAdd(members: [GuildMember | PartialGuildMember]): void {
    const [member] = members;
    userJoined(member.user.id, member.guild.id);
  }

  @On("guildMemberRemove")
  onGuildMemberRemove(members: [GuildMember | PartialGuildMember]): void {
    members.forEach((member) => {
      userRemoved(member.user.id, member.guild.id);
    });
  }
}

export default Events;
