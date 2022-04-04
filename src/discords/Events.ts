/* eslint-disable class-methods-use-this */
import {
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
  Permissions,
  RateLimitData,
  Role,
} from "discord.js";
import { Discord, Guard, On } from "discordx";
import IsDM from "../guards/IsDM";
import NotABot from "../guards/NotABot";
import NotACommand from "../guards/NotACommand";
import Main from "../Main";
import { getGuildsOfServer, userJoined, userRemoved } from "../service";
import logger from "../utils/logger";

@Discord()
abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
  }

  @On("rateLimit")
  onRateLimit(rateLimited: RateLimitData): void {
    logger.warn(`BOT Rate Limited. ${JSON.stringify(rateLimited)}`);
  }

  @On("messageCreate")
  @Guard(NotABot, IsDM, NotACommand)
  onPrivateMessage([message]: [Message]): void {
    logger.verbose(
      `unkown request: ${message.author.username}#${message.author.discriminator}: ${message.content}`
    );
    const embed = new MessageEmbed({
      title: "I'm sorry, but I couldn't interpret your request.",
      color: `#ff0000`,
      description:
        "You can find more information on [agora.xyz](https://agora.xyz) or on [guild.xyz](https://guild.xyz).",
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

  @On("roleCreate")
  async onRoleCreate([role]: [Role]): Promise<void> {
    const guildOfServer = await getGuildsOfServer(role.guild.id);
    const entryChannel = await role.guild.channels.fetch(
      guildOfServer[0].inviteChannel
    );

    await role.edit({ permissions: role.permissions.add("VIEW_CHANNEL") });

    if (
      !entryChannel.permissionOverwrites.cache
        .get(role.id)
        ?.deny.has(Permissions.FLAGS.VIEW_CHANNEL)
    )
      await entryChannel.permissionOverwrites.create(
        role,
        { VIEW_CHANNEL: false, SEND_MESSAGES: false },
        {
          reason: `Role edited by ${Main.Client.user.username} because Guild Guard is enabled.`,
        }
      );
  }
}

export default Events;
