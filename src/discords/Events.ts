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
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import axios from "axios";
import IsDM from "../guards/IsDM";
import NotABot from "../guards/NotABot";
import NotACommand from "../guards/NotACommand";
import Main from "../Main";
import { userJoined, userRemoved } from "../service";
import logger from "../utils/logger";
import pollStorage from "../api/pollStorage";
import config from "../config";
import getReactions from "../api/reactions";
import { logAxiosResponse } from "../utils/utils";

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

    const result = msg.embeds[0].title
      .match(/Poll #(.*?): /g)
      .map((str) => str.substring(6, str.length - 2));

    if (result.length === 1) {
      try {
        const pollId = Number(result[0]);

        const pollResponse = await axios.get(
          `${config.backendUrl}/poll/${pollId}`
        );

        logAxiosResponse(pollResponse);

        const poll = pollResponse.data;

        if (!removed) {
          const emoji = reaction._emoji;

          let userReactions;

          if (
            poll.reactions.includes(`<:${emoji.name}:${emoji.id}>`) ||
            poll.reactions.includes(emoji.name)
          ) {
            userReactions = msg.reactions.cache.filter(
              (react) =>
                react.users.cache.has(user.id) && react._emoji !== emoji
            );
          } else {
            userReactions = msg.reactions.cache.filter(
              (react) =>
                react.users.cache.has(user.id) && react._emoji === emoji
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
          await getReactions(msg.channelId, msg.id, poll.reactions)
        ).map((react) => react.users.length);

        const voteCount = reacResults.reduce((a, b) => a + b);

        let content = "";

        for (let i = 0; i < poll.options.length; i += 1) {
          let percentage = `${(reacResults[i] / voteCount) * 100}`;

          if (Number(percentage) % 1 !== 0) {
            percentage = Number(percentage).toFixed(2);
          }

          if (percentage === "NaN") {
            percentage = "0";
          }

          content += `\n${poll.reactions[i]} ${poll.options[i]} (${percentage}%)`;
        }

        dayjs.extend(utc);

        content += `\n\nPoll ends on ${dayjs
          .unix(Number(poll.expDate))
          .utc()
          .format("YYYY-MM-DD HH:mm UTC")}`;

        content += `\n\n${voteCount} person${
          voteCount > 1 || voteCount === 0 ? "s" : ""
        } voted so far.`;

        msg.embeds[0].description = content;

        msg.edit({ embeds: [msg.embeds[0]] });
      } catch (e) {
        logger.error(e);
      }
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
    const userId = message.author.id;
    const poll = pollStorage.getPoll(userId);

    if (poll) {
      switch (pollStorage.getUserStep(userId)) {
        case 2: {
          if (poll.options.length === poll.reactions.length) {
            pollStorage.savePollOption(userId, message.content);

            message.reply("Now send me the corresponding emoji");
          } else {
            pollStorage.savePollReaction(userId, message.content);

            if (poll.options.length >= 2) {
              message.reply(
                "Give me a new option or go to the nex step by using " +
                  "**/enough**"
              );
            } else {
              message.reply("Give me the next option");
            }
          }

          break;
        }

        case 3: {
          try {
            const duration = message.content.split(":");

            const expDate = dayjs()
              .add(parseInt(duration[0], 10), "day")
              .add(parseInt(duration[1], 10), "hour")
              .add(parseInt(duration[2], 10), "minute")
              .unix();

            pollStorage.savePollExpDate(userId, expDate.toString());
            pollStorage.setUserStep(userId, 4);

            await message.reply("Your poll will look like this:");

            let content = "";

            for (let i = 0; i < poll.options.length; i += 1) {
              content += `\n${poll.reactions[i]} ${poll.options[i]} (0%)`;
            }

            dayjs.extend(utc);

            content += `\n\nPoll ends on ${dayjs
              .unix(Number(poll.expDate))
              .utc()
              .format("YYYY-MM-DD HH:mm UTC")}`;

            content += "\n\n0 persons voted so far.";

            const embed = new MessageEmbed({
              title: `Poll #69: ${poll.question}`,
              color: `#${config.embedColor}`,
              description: content,
            });

            const msg = await message.channel.send({ embeds: [embed] });

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

        case 1: {
          pollStorage.savePollQuestion(userId, message.content);
          pollStorage.setUserStep(userId, 2);

          message.channel.send(
            "Give me the options and the corresponding emojies for the poll " +
              "(one after another)."
          );

          break;
        }

        default: {
          break;
        }
      }
    } else {
      const embed = new MessageEmbed({
        title: "I'm sorry, but I couldn't interpret your request.",
        color: `#ff0000`,
        description:
          "You can find more information on [docs.guild.xyz](https://docs.guild.xyz/).",
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
