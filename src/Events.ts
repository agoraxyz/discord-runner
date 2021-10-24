/* eslint-disable class-methods-use-this */
import { Discord, Guard, On } from "@typeit/discord";
import {
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
} from "discord.js";
import config from "./config";
import IsAPrivateMessage from "./Guards/IsAPrivateMessage";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { userJoined, userRemoved } from "./service";
import logger from "./utils/logger";

@Discord()
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
      logger.verbose(
        `unkown request: ${message.author.username}#${message.author.discriminator}: ${message.content}`
      );
      const embed = new MessageEmbed({
        title: "I'm sorry, but I couldn't interpret your request.",
        color: `#${config.embedColor}`,
        description:
          "You can find more information in our [gitbook](https://agoraspace.gitbook.io/agoraspace/try-our-tools) or on the [Agora](https://app.agora.space/) website.",
      });
      message.channel.send({ embeds: [embed] }).catch(logger.error);
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
    Main.Client.guilds.fetch(invite[0].guild.id).then((guild) => {
      logger.verbose(`onInviteDelete guild: ${guild.name}`);

      const inviteChannelId = Main.inviteDataCache.get(
        guild.id
      )?.inviteChannelId;

      guild.invites.create(inviteChannelId, { maxAge: 0 }).then((newInvite) => {
        Main.inviteDataCache.set(guild.id, {
          code: newInvite.code,
          inviteChannelId,
        });
        logger.verbose(
          `invite code cache updated: ${guild.id}, ${newInvite.code}`
        );
      });
    });
  }
}

export default Events;
