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
import { getRequestJoinCodeEmbed, handleJoinCode } from "./utils/utils";

const existingInvites: Map<string, string[]> = new Map();

@Description("Event listeners.")
abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
    Main.Client.guilds.cache.forEach((guild) => {
      guild
        .fetchInvites()
        .then((guildInvites) => {
          existingInvites.set(
            guild.id,
            guildInvites
              .filter((i) => i.inviter.id === Main.Client.user.id)
              .map((i) => i.code)
          );
        })
        .catch(logger.error);
    });
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
        if (message.content.match(/^\d{4}$/)) {
          handleJoinCode(message.content, message.author);
        } else {
          const embed = new MessageEmbed({
            title: "I'm sorry, but I couldn't interpret your request.",
            color: config.embedColor,
            description:
              "You can find more information on the [Agora](https://app.agora.space/) website.",
          });
          message.channel.send(embed);
        }
      }
    });
  }

  @On("inviteCreate")
  onInviteCreated(invites: [Invite]) {
    invites.forEach((invite) => {
      existingInvites.get(invite.guild.id).push(invite.code);
    });
  }

  @On("guildMemberAdd")
  onGuildMemberAdd(members: [GuildMember | PartialGuildMember]): void {
    if (members.length === 1) {
      const member = members[0];

      member.guild.fetchInvites().then((currentInvites) => {
        const currentBotInvites = currentInvites.filter(
          (i) => i.inviter.id === Main.Client.user.id
        );

        const previousInvites = existingInvites.get(member.guild.id);
        existingInvites.set(
          member.guild.id,
          currentBotInvites.map((i) => i.code)
        );

        const usedInvites = previousInvites.filter(
          (i) => !currentBotInvites.has(i)
        );

        if (usedInvites && usedInvites.length === 1) {
          userJoined(usedInvites[0], member.user.id, false);
        } else {
          // TODO: get the url of the community and send it to the user
          const embed = getRequestJoinCodeEmbed();
          member.send(embed);
          logger.debug("ambiguous invite code");
        }
      });
    } else {
      members.forEach((member) => {
        const embed = getRequestJoinCodeEmbed();
        member.send(embed);
      });
      logger.debug("more than one join at the same time");
    }
  }

  @On("guildMemberRemove")
  onGuildMemberRemove(members: [GuildMember | PartialGuildMember]): void {
    members.forEach((member) => {
      userRemoved(member.user.id, member.guild.id);
    });
  }
}

export default Events;
