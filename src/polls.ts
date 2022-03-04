/* eslint no-return-await: "off" */

import { CommandInteraction, TextChannel } from "discord.js";
import { NewPoll } from "./api/types";
import Main from "./Main";
import DB from "./testdb/db";
import logger from "./utils/logger";

const createPoll = async (
  _poll: NewPoll,
  interaction?: CommandInteraction
): Promise<boolean> => {
  try {
    const channel = Main.Client.channels.cache.get(
      _poll.channelId
    ) as TextChannel;

    let content = `Poll #${DB.lastId()}:\n\n${_poll.question}\n`;

    for (let i = 0; i < _poll.options.length; i += 1) {
      content += `\n${_poll.reactions[i]} ${_poll.options[i]} (0%)`;
    }

    content += "\n\n0 people voted so far.";

    const msg: any = interaction
      ? await interaction.reply({ content, fetchReply: true })
      : await channel.send(content);

    _poll.reactions.map(async (emoji) => await msg.react(emoji));

    /* prettier-ignore */
    const poll = {
      channelId: _poll.channelId,
      messageId: msg.id,
      question : _poll.question,
      options  : _poll.options,
      reactions: _poll.reactions,
      endDate  : _poll.endDate,
      ended    : false,
      voteCount: 0,
      results  : []
    };

    DB.add(poll);

    return true;
  } catch (e) {
    logger.error(e);
  }

  return false;
};

const endPoll = async (
  id: string,
  interaction?: CommandInteraction
): Promise<void> => {
  const poll = DB.get(id);

  if (poll) {
    const owner = interaction.guild
      ? await interaction.guild.fetchOwner()
      : await (
          Main.Client.channels.cache.get(poll.channelId) as any
        ).guild.fetchOwner();

    if (interaction.user.id === owner.id) {
      poll.ended = true;

      DB.set(Number(id), poll);

      interaction.reply({
        content: `Poll #${id} has been closed.`,
        ephemeral: interaction.channel.type !== "DM",
      });
    } else {
      interaction.reply({
        content: "Seems like you are not the guild owner.",
        ephemeral: interaction.channel.type !== "DM",
      });
    }
  } else {
    interaction.reply({
      content: `Couldn't find a poll with the id #${id}.`,
      ephemeral: interaction.channel.type !== "DM",
    });
  }
};

const hasEnded = async (id: string): Promise<boolean> => DB.get(id).ended;

export { createPoll, endPoll, hasEnded };
