/* eslint-disable class-methods-use-this */
/* eslint no-return-await: "off" */

import {
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
  RateLimitData,
} from "discord.js";
import { Discord, Guard, On } from "discordx";
import JSONdb from "simple-json-db";
import dayjs from "dayjs";
import IsDM from "../guards/IsDM";
import { NewPoll } from "../api/types";
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

  @On("rateLimit")
  onRateLimit(rateLimited: RateLimitData): void {
    logger.warn(`BOT Rate Limited. ${JSON.stringify(rateLimited)}`);
  }

  @On("messageCreate")
  @Guard(NotABot, IsDM, NotACommand)
  async onPrivateMessage([message]: [Message]): Promise<void> {
    const db = new JSONdb("polls.json");
    const authorId = message.author.id;
    const poll = db.get(authorId) as NewPoll;

    if (poll) {
      switch (poll.status) {
        case 1: {
          if (poll.options.length === poll.reactions.length) {
            poll.options.push(message.content);

            message.reply("Now send me the corresponding emoji");
          } else {
            poll.reactions.push(message.content);

            if (poll.options.length >= 2) {
              message.reply(
                "Give me a new option or go to the nex step by using " +
                  "**/enough**"
              );
            } else {
              message.reply("Give me the next option");
            }
          }

          db.set(authorId, poll);
          db.sync();

          break;
        }

        case 2: {
          try {
            const duration = message.content.split(":");

            const expDate = dayjs()
              .add(parseInt(duration[0], 10), "day")
              .add(parseInt(duration[1], 10), "hour")
              .add(parseInt(duration[2], 10), "minute");

            poll.endDate = expDate.toString();
            poll.status += 1;

            db.set(authorId, poll);
            db.sync();

            await message.reply("Your poll will look like this:");

            let content = `${poll.question}\n`;

            for (let i = 0; i < poll.options.length; i += 1) {
              content += `\n${poll.reactions[i]} ${poll.options[i]}`;
            }

            const msg = await message.reply(content);

            poll.reactions.map(async (emoji) => await msg.react(emoji));

            await message.reply(
              "You can accept it by using **/done**,\n" +
                "reset the data by using **/reset**\n" +
                "or cancel it using **/cancel**."
            );
          } catch (e) {
            message.reply("Incorrect input, please try again.");
          }

          break;
        }

        default: {
          poll.question = message.content;
          poll.status += 1;

          db.set(authorId, poll);
          db.sync();

          message.channel.send(
            "Give me the options and the corresponding emojies for the poll " +
              "(one after another)."
          );

          break;
        }
      }
    } else {
      const embed = new MessageEmbed({
        title: "I'm sorry, but I couldn't interpret your request.",
        color: `#ff0000`,
        description:
          "You can find more information on [agora.xyz](https://agora.xyz) or on [guild.xyz](https://guild.xyz).",
      });

      message.channel.send({ embeds: [embed] }).catch(logger.error);

      logger.verbose(
        `unkown request: ${message.author.username}#${message.author.discriminator}: ${message.content}`
      );
    }
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
