/* eslint no-return-await: "off" */

import {
  CommandInteraction,
  Message,
  MessageEmbed,
  TextChannel,
} from "discord.js";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { NewPoll, Poll, UserVote } from "./types";
import Main from "../Main";
import logger from "../utils/logger";
import config from "../config";
import { logAxiosResponse } from "../utils/utils";

const createPollText = async (
  poll: NewPoll | Poll,
  votersResponse = undefined
): Promise<string> => {
  const { options, reactions } = poll;

  const votesByOption: {
    [k: number]: UserVote[];
  } = votersResponse
    ? votersResponse.data
    : Object.fromEntries(options.map((_, idx) => [idx, []]));

  const votesForEachOption = options.map((_, idx) =>
    votesByOption[idx].length
      ? votesByOption[idx].map((vote) => vote.balance).reduce((a, b) => a + b)
      : 0
  );

  const allVotes = votesForEachOption.reduce((a, b) => a + b);

  const optionsText = options
    .map((option, idx) => {
      const perc =
        votesByOption[idx].length > 0
          ? (votesForEachOption[idx] / allVotes) * 100
          : 0;

      return `${reactions[idx]} ${option}\n▫️${
        Number.isInteger(perc) ? perc : perc.toFixed(2)
      }%`;
    })
    .join("\n\n");

  dayjs.extend(utc);

  const dateText = `Poll ends on ${dayjs
    .unix(Number(poll.expDate))
    .utc()
    .format("YYYY-MM-DD HH:mm UTC")}`;

  const numOfVoters = options
    .map((_, idx) => votesByOption[idx].length)
    .reduce((a, b) => a + b);

  const votersText = `👥 ${numOfVoters} person${
    numOfVoters === 1 ? "" : "s"
  } voted so far.`;

  return `${optionsText}\n\n${dateText}\n\n${votersText}`;
};

const createPoll = async (poll: NewPoll): Promise<boolean> => {
  const { question, expDate, options, reactions, requirementId } = poll;

  try {
    const channel = Main.Client.channels.cache.get(
      poll.channelId
    ) as TextChannel;

    const res = await axios.post(
      `${config.backendUrl}/poll`,
      {
        platform: config.platform,
        platformId: channel.guildId,
        requirementId,
        question,
        startDate: dayjs().unix(),
        expDate,
        options,
        reactions,
      },
      { timeout: 150000 }
    );

    logAxiosResponse(res);

    const storedPoll: Poll = res.data;

    const embed = new MessageEmbed({
      title: `Poll #${storedPoll.id}: ${question}`,
      color: `#${config.embedColor}`,
      description: await createPollText(storedPoll),
    });

    const msg = await channel.send({ embeds: [embed] });

    poll.reactions.map(async (emoji) => await (msg as Message).react(emoji));

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
  const pollResponse = await axios.get(`${config.backendUrl}/poll/${id}`);

  logAxiosResponse(pollResponse);

  const poll = pollResponse.data;

  if (poll) {
    const owner = interaction.guild
      ? await interaction.guild.fetchOwner()
      : await (
          Main.Client.channels.cache.get(poll.channelId) as any
        ).guild.fetchOwner();

    if (interaction.user.id === owner.id) {
      poll.ended = true;

      const res = await axios.post(`${config.backendUrl}/poll`, poll, {
        timeout: 150000,
      });

      logAxiosResponse(res);

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

const hasEnded = async (id: string): Promise<boolean> => {
  const pollResponse = await axios.get(`${config.backendUrl}/poll/${id}`);

  logAxiosResponse(pollResponse);

  return pollResponse.data.ended;
};

export { createPollText, createPoll, endPoll, hasEnded };
