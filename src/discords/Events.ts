/* eslint-disable class-methods-use-this */
/* eslint no-return-await: "off" */
/* eslint no-underscore-dangle: "off" */

import {
  Collection,
  GuildMember,
  Invite,
  Message,
  MessageEmbed,
  MessageReaction,
  PartialGuildMember,
  PartialMessageReaction,
  PartialUser,
  RateLimitData,
  Role,
  User,
} from "discord.js";
import { Discord, Guard, On } from "discordx";
import dayjs from "dayjs";
import axios from "axios";
import IsDM from "../guards/IsDM";
import NotABot from "../guards/NotABot";
import NotACommand from "../guards/NotACommand";
import Main from "../Main";
import { getGuildsOfServer, userJoined, userRemoved } from "../service";
import logger from "../utils/logger";
import pollStorage from "../api/pollStorage";
import config from "../config";
import { Vote } from "../api/types";
import NotDM from "../guards/NotDM";
import { createPollText } from "../api/polls";

const messageReactionCommon = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  removed: boolean
) => {
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

    const result = msg.embeds[0]?.title
      .match(/Poll #(.*?): /g)
      .map((str: string) => str.substring(6, str.length - 2));

    if (result?.length === 1) {
      try {
        const pollId = +result[0];

        const pollResponse = await axios.get(
          `${config.backendUrl}/poll/${pollId}`
        );

        const poll = pollResponse.data;

        const { reactions, expDate } = poll;

        if (dayjs().isBefore(dayjs.unix(expDate))) {
          const { emoji } = reaction;
          const emojiName = emoji.id
            ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
            : emoji.name;

          if (!removed) {
            let userReactions: Collection<string, MessageReaction>;

            if (reactions.includes(emojiName)) {
              const optionIndex = reactions.indexOf(emojiName);

              await axios.post(`${config.backendUrl}/poll/vote`, {
                platform: config.platform,
                pollId,
                platformUserId: user.id,
                optionIndex,
              } as Vote);

              userReactions = msg.reactions.cache.filter(
                (react) =>
                  react.users.cache.has(user.id) && react.emoji !== emoji
              );
            } else {
              userReactions = msg.reactions.cache.filter(
                (react) =>
                  react.users.cache.has(user.id) && react.emoji === emoji
              );
            }

            try {
              Array.from(userReactions.values()).map(
                async (react) =>
                  await msg.reactions.resolve(react).users.remove(user.id)
              );
            } catch (error) {
              logger.error("Failed to remove reaction:", error);
            }
          } else if (reactions.includes(emojiName)) {
            const optionIndex = reactions.indexOf(emojiName);

            await axios.delete(`${config.backendUrl}/poll/vote`, {
              data: {
                platform: config.platform,
                pollId,
                platformUserId: user.id,
                optionIndex,
              } as Vote,
            });
          }

          const results = await axios.get(
            `${config.backendUrl}/poll/results/${pollId}`
          );

          msg.embeds[0].description = await createPollText(poll, results);

          msg.edit({ embeds: [msg.embeds[0]] });
        } else {
          logger.warn(`Poll #${pollId} has already expired.`);
        }
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
  @Guard(NotABot, NotDM)
  async onPublicMessage([message]: [Message]): Promise<void> {
    if (
      message.content.toLowerCase().match(/^(#|!|\/)((join)(-guild|)|verify)$/)
    ) {
      message.reply(
        "You are close, but not enough.\n" +
          'Please find the post that has a "join" button and click the button.'
      );
    }
  }

  @On("messageCreate")
  @Guard(NotABot, IsDM, NotACommand)
  async onPrivateMessage([message]: [Message]): Promise<void> {
    const userId = message.author.id;
    const msgText = message.content;
    const poll = pollStorage.getPoll(userId);

    if (poll) {
      const { question, options, reactions } = poll;

      switch (pollStorage.getUserStep(userId)) {
        case 1: {
          pollStorage.savePollQuestion(userId, message.content);
          pollStorage.setUserStep(userId, 2);

          message.channel.send(
            "Please give me the options and the corresponding emotes for the poll (one after another).\n" +
              "Make sure that you only use emotes from the server on which you want to create the poll."
          );

          break;
        }

        case 2: {
          if (options.length === reactions.length) {
            if (options.length === 20) {
              message.reply("You have reached the maximum number of options.");

              break;
            }

            if (!options.includes(message.content)) {
              pollStorage.savePollOption(userId, message.content);

              message.reply("Now send me the corresponding emoji");
            } else {
              message.reply("This option has already been added");
            }
          } else if (!reactions.includes(message.content)) {
            const emojiRegex = /\p{Extended_Pictographic}/gu;
            const emoteRegex = /<[a ]:\w+:[0-9]+>/;

            if (
              message.content.match(emojiRegex) ||
              message.content.match(emoteRegex)
            ) {
              pollStorage.savePollReaction(userId, message.content);

              if (options.length >= 2) {
                message.reply(
                  "Please give me a new option or go to the next step by using **/enough**"
                );
              } else {
                message.reply("Give me the next option");
              }
            } else {
              message.reply("The message you sent doesn't contain any emoji");
            }
          } else {
            message.reply(
              "This emoji has already been used, choose another one"
            );
          }

          break;
        }

        case 3: {
          try {
            const dateRegex =
              /([1-9][0-9]*|[0-9]):([0-1][0-9]|[0-9]|[2][0-4]):([0-5][0-9]|[0-9])/;
            const found = msgText.match(dateRegex);

            if (!found) {
              await message.reply(
                "The message you sent me is not in the DD:HH:mm format. Please verify the contents of your message and send again."
              );

              return;
            }

            const [day, hour, minute] = msgText.split(":");

            const expDate = dayjs()
              .add(parseInt(day, 10), "day")
              .add(parseInt(hour, 10), "hour")
              .add(parseInt(minute, 10), "minute")
              .unix()
              .toString();

            poll.expDate = expDate;

            pollStorage.savePollExpDate(userId, expDate);
            pollStorage.setUserStep(userId, 4);

            await message.reply("Your poll will look like this:");

            const embed = new MessageEmbed({
              title: `Poll #69: ${question}`,
              color: `#${config.embedColor}`,
              description: await createPollText(poll),
            });

            const msg = await message.channel.send({ embeds: [embed] });

            reactions.map(async (emoji) => await msg.react(emoji));

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
  onMessageReactionAdd([reaction, user]: [
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ]): void {
    messageReactionCommon(reaction, user, false);
  }

  @On("messageReactionRemove")
  onMessageReactionRemove([reaction, user]: [
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ]): void {
    messageReactionCommon(reaction, user, true);
  }

  @On("roleCreate")
  async onRoleCreate([role]: [Role]): Promise<void> {
    const guildOfServer = await getGuildsOfServer(role.guild.id);

    if (!guildOfServer?.[0]?.isGuarded) {
      return;
    }

    await role.edit({ permissions: role.permissions.remove("VIEW_CHANNEL") });
  }
}

export default Events;
