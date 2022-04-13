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
import { NewPoll, Poll } from "./types";
import Main from "../Main";
import logger from "../utils/logger";
import config from "../config";
import { logAxiosResponse } from "../utils/utils";

const createPoll = async (poll: NewPoll): Promise<boolean> => {
  try {
    const channel = Main.Client.channels.cache.get(
      poll.channelId
    ) as TextChannel;

    const { question, expDate, options, reactions, requirementId } = poll;

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

    const optionsText = options
      .map((option, idx) => `${reactions[idx]} ${option}\n▫️0%`)
      .join("\n\n");

    dayjs.extend(utc);

    const dateText = `Poll ends on ${dayjs
      .unix(Number(poll.expDate))
      .utc()
      .format("YYYY-MM-DD HH:mm UTC")}`;

    const votersText = "👥 0 persons voted so far.";

    const embed = new MessageEmbed({
      title: `Poll #${storedPoll.id}: ${poll.question}`,
      color: `#${config.embedColor}`,
      description: `${optionsText}\n\n${dateText}\n\n${votersText}`,
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

export { createPoll, endPoll, hasEnded };
