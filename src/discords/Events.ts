/* eslint-disable class-methods-use-this */
import {
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
} from "discord.js";
import { Discord, Guard, On } from "discordx";
import config from "../config";
import IsAPrivateMessage from "../guards/IsAPrivateMessage";
import NotABot from "../guards/NotABot";
import NotACommand from "../guards/NotACommand";
import Main from "../Main";
import { userJoined, userRemoved } from "../service";
import logger from "../utils/logger";

@Discord()
abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
  }

  @On("messageCreate")
  @Guard(NotABot, IsAPrivateMessage, NotACommand)
  onPrivateMessage([message]: [Message]): void {
    logger.verbose(
      `unkown request: ${message.author.username}#${message.author.discriminator}: ${message.content}`
    );
    const embed = new MessageEmbed({
      title: "I'm sorry, but I couldn't interpret your request.",
      color: `#${config.embedColor}`,
      description:
        "You can find more information on [agora.xyz](https://agora.xyz) or on [alpha.guild.xyz](https://alpha.guild.xyz).",
    });
    message.channel.send({ embeds: [embed] }).catch(logger.error);
  }

  @On("guildMemberAdd")
  onGuildMemberAdd([member]: [GuildMember | PartialGuildMember]): void {
    userJoined(member.user.id, member.guild.id);
  }

  @On("guildMemberRemove")
  onGuildMemberRemove([member]: [GuildMember | PartialGuildMember]): void {
    userRemoved(member.user.id, member.guild.id);
  }

  @On("inviteDelete")
  onInviteDelete([invite]: [Invite]): void {
    Main.Client.guilds.fetch(invite.guild.id).then((guild) => {
      logger.verbose(`onInviteDelete guild: ${guild.name}`);

      const inviteChannelId = Main.inviteDataCache.get(
        guild.id
      )?.inviteChannelId;

      if (inviteChannelId) {
        guild.invites
          .create(inviteChannelId, { maxAge: 0 })
          .then((newInvite) => {
            Main.inviteDataCache.set(guild.id, {
              code: newInvite.code,
              inviteChannelId,
            });
            logger.verbose(
              `invite code cache updated: ${guild.id}, ${newInvite.code}`
            );
          });
      }
    });
  }
}

export default Events;
