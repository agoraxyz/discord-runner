/* eslint-disable class-methods-use-this */
/* eslint no-return-await: "off" */
/* eslint no-underscore-dangle: "off" */

import {
  ClientUser,
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  PartialGuildMember,
  RateLimitData,
  ReactionEmoji,
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
import DB from "../testdb/db";
import getReactions from "../api/reactions";

const messageReactionCommon = async (reaction, user, removed: boolean) => {
  if (!user.bot) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error("Something went wrong when fetching the message:", error);

        return;
      }
    }

    const msg = reaction.message;

    const entries = DB.getKeys()
      .map((key) => ({ key, poll: DB.get(key) }))
      .filter(
        (entry) =>
          entry.poll.channelId === msg.channelId &&
          entry.poll.messageId === msg.id
      );

    if (entries !== [] && entries !== undefined) {
      const { key } = entries[0];
      const { poll } = entries[0];

      if (!removed) {
        const emoji = reaction._emoji;

        let userReactions;

        if (
          poll.reactions.includes(`<:${emoji.name}:${emoji.id}>`) ||
          poll.reactions.includes(emoji.name)
        ) {
          userReactions = msg.reactions.cache.filter(
            (react) => react.users.cache.has(user.id) && react._emoji !== emoji
          );
        } else {
          userReactions = msg.reactions.cache.filter(
            (react) => react.users.cache.has(user.id) && react._emoji === emoji
          );
        }

        try {
          Array.from(userReactions.values()).map(
            async (react) => await (react as any).users.remove(user.id)
          );
        } catch (error) {
          logger.error("Failed to remove reaction:", error);
        }
      }

      const reacResults = (
        await getReactions(poll.channelId, poll.messageId, poll.reactions)
      ).map((react) => react.users.length);

      poll.results = reacResults;
      poll.voteCount = reacResults.reduce((a, b) => a + b);

      let content = `Poll #${DB.lastId()}:\n\n${poll.question}\n`;

      for (let i = 0; i < poll.options.length; i += 1) {
        let percentage = `${(reacResults[i] / poll.voteCount) * 100}`;

        if (Number(percentage) % 1 !== 0) {
          percentage = Number(percentage).toFixed(2);
        }

        if (percentage === "NaN") {
          percentage = "0";
        }

        content += `\n${poll.reactions[i]} ${poll.options[i]} (${percentage}%)`;
      }

      content += `\n\n${poll.voteCount} person${
        poll.voteCount > 1 || poll.voteCount === 0 ? "s" : ""
      } voted so far.`;

      await msg.edit(content);

      DB.set(Number(key), poll);
    }
  }
};

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

  @On("messageReactionAdd")
  onMessageReactionAdd([reaction, user]: [ReactionEmoji, ClientUser]): void {
    messageReactionCommon(reaction, user, false);
  }

  @On("messageReactionRemove")
  onMessageReactionRemove([reaction, user]: [ReactionEmoji, ClientUser]): void {
    messageReactionCommon(reaction, user, true);
  }
}

export default Events;
