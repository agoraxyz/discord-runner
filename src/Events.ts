/* eslint-disable class-methods-use-this */
import { Description, Guard, On } from "@typeit/discord";
import {
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
} from "discord.js";
import Commands from "./Commands";
import config from "./config";
import IsAPrivateMessage from "./Guards/IsAPrivateMessage";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
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
          `unkown request: ${message.author.username}#${message.author.discriminator}: ${message.content}`
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

  @On("inviteDelete")
  onInviteDelete(invite: [Invite]): void {
    const { guild } = invite[0];
    logger.verbose(`onInviteDelete guild: ${guild.name}`);
    guild.systemChannel.createInvite({ maxAge: 0 }).then((newInvite) => {
      Main.inviteCodeCache.set(guild.id, newInvite.code);
      logger.verbose(
        `invite code cache updated: ${guild.id}, ${newInvite.code}`
      );
    });
  }
}

export default Events;
