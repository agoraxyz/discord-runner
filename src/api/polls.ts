/* eslint no-return-await: "off" */

import { CommandInteraction, TextChannel } from "discord.js";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { NewPoll, Poll } from "./types";
import Main from "../Main";
import logger from "../utils/logger";
import config from "../config";
import pollStorage from "./pollStorage";

const getRequirement = (requirement) => {
  const { id, type, symbol, name, address, chain } = requirement;

  let req: string;

  switch (type) {
    case "ERC20":
    case "ERC721":
    case "ERC1155": {
      req =
        name !== "-"
          ? name
          : `${address.substring(0, 5)}...${address.substring(38, 42)}`;
      break;
    }

    case "COIN": {
      req = name !== "-" ? name : symbol;
      break;
    }

    case "ALLOWLIST": {
      req = "Allowlist";
      break;
    }

    case "FREE": {
      req = "Free";
      break;
    }

    default: {
      break;
    }
  }

  return { id, type, name: req, chain };
};

const createPollText = async (
  poll: NewPoll | Poll,
  results = undefined
): Promise<string> => {
  const {
    requirementId,
    platformId,
    description,
    options,
    reactions,
    expDate,
  } = poll;

  const [pollResults, numOfVoters] = results
    ? results.data
    : [options.map(() => 0), 0];

  const allVotes = pollResults.reduce((a, b) => a + b, 0);

  const optionsText = options
    .map((option, idx) => {
      const perc = (pollResults[idx] / (allVotes || 1)) * 100;

      return `${reactions[idx]} ${option}\n▫️${
        Number.isInteger(perc) ? perc : perc.toFixed(2)
      }%`;
    })
    .join("\n\n");

  dayjs.extend(utc);

  const dateText = dayjs().isAfter(dayjs.unix(+expDate))
    ? "Poll has already ended."
    : `Poll ends on <t:${expDate}>`;

  const guildRes = await axios.get(
    `${config.backendUrl}/guild/platformId/${platformId}`
  );

  const requirements = guildRes?.data?.roles[0]?.requirements.filter(
    (req) => req.id === requirementId
  );

  const { type, name, chain } = getRequirement(requirements[0]);

  const requirementText = type.match(/^(ALLOWLIST|FREE)$/)
    ? ""
    : `This poll is weighted by the "${name}" token on the "${chain}" chain.\n\n`;

  const votersText = `👥 ${numOfVoters} person${
    numOfVoters === 1 ? "" : "s"
  } voted so far.`;

  return `${
    description ? `${description}\n\n` : ""
  }${optionsText}\n\n${dateText}\n\n${requirementText}${votersText}`;
};

const createPoll = async (poll: NewPoll): Promise<boolean> => {
  try {
    const channel = Main.Client.channels.cache.get(
      poll.channelId
    ) as TextChannel;

    await axios.post(
      `${config.backendUrl}/poll`,
      {
        platform: config.platform,
        platformId: channel.guildId,
        startDate: dayjs().unix(),
        ...poll,
      },
      { timeout: 150000 }
    );

    return true;
  } catch (e) {
    logger.error(e);
  }

  return false;
};

const pollBuildResponse = async (
  interaction: CommandInteraction
): Promise<boolean> => {
  const poll = pollStorage.getPoll(interaction.user.id);

  if (poll) {
    if (poll.requirementId === 0) {
      interaction.reply({
        content: "You must choose a token for weighting.",
        ephemeral: interaction.inGuild(),
      });

      return true;
    }

    if (poll.question === "") {
      interaction.reply({
        content: "The poll must have a question.",
        ephemeral: interaction.inGuild(),
      });

      return true;
    }

    if (poll.options.length <= 1) {
      interaction.reply({
        content: "The poll must have at least two options.",
        ephemeral: interaction.inGuild(),
      });

      return true;
    }

    if (poll.options.length !== poll.reactions.length) {
      interaction.reply({
        content: "The amount of options and reactions must be the same.",
        ephemeral: interaction.inGuild(),
      });

      return true;
    }

    if (poll.expDate === "") {
      interaction.reply({
        content: "The poll must have an expriation date.",
        ephemeral: interaction.inGuild(),
      });

      return true;
    }
  } else {
    interaction.reply({
      content: "You don't have an active poll creation process.",
      ephemeral: interaction.inGuild(),
    });

    return true;
  }

  return false;
};

export { getRequirement, createPollText, createPoll, pollBuildResponse };
