import { AxiosResponse } from "axios";
import { DiscordAPIError, GuildMember, MessageEmbed, User } from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import { userJoined } from "../service";
import logger from "./logger";

const getUserResult = (member: GuildMember): UserResult => ({
  username: member.user.username,
  discriminator: member.user.discriminator,
  avatar: member.user.avatar,
  roles: member.roles.cache
    .filter((role) => role.id !== member.guild.roles.everyone.id)
    .map((role) => role.id),
});

const getErrorResult = (error: Error): ErrorResult => {
  let errorMsg: string;
  let ids: string[];
  if (error instanceof DiscordAPIError) {
    if (error.code === 50001) {
      // Missing access
      errorMsg = "guild not found";
    } else if (error.code === 10013) {
      // Unknown User
      errorMsg = "cannot fetch member";
    } else if (error.code === 10007) {
      // Unknown Member
      errorMsg = "user is not member";
    } else {
      errorMsg = "discord api error";
    }
  } else if (error instanceof ActionError) {
    errorMsg = error.message;
    ids = error.ids;
  } else {
    logger.error(error);
    errorMsg = "unknown error";
  }
  return {
    errors: [
      {
        msg: errorMsg,
        value: ids,
      },
    ],
  };
};

const logBackendError = (error) => {
  if (
    error.response?.data?.errors?.length > 0 &&
    error.response?.data?.errors[0]?.msg
  ) {
    logger.error(error.response.data.errors[0].msg);
  } else {
    logger.error(error);
  }
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  logger.verbose(
    `${res.status} ${res.statusText} data:${JSON.stringify(res.data)}`
  );
};

const handleJoinCode = async (joinCode: string, author: User) => {
  userJoined(joinCode, author.id, true).then((ok) => {
    const embed = ok
      ? new MessageEmbed({
          title: "You have successfully joined.",
          color: "44ef44",
        })
      : new MessageEmbed({
          title: "Join failed.",
          description: "Wrong join code.",
          color: "ef4444",
        });
    author.send(embed).catch(logger.error);
  });
};

const getRequestJoinCodeEmbed = () =>
  new MessageEmbed({
    title:
      "Please enter the provided 4-digit join code to connect your Discord account to Agora Space.",
    color: config.embedColor,
    image: {
      url: "https://cdn.discordapp.com/attachments/701319775925829693/861979264660668446/Slice_1.png",
    },
  });

export {
  getUserResult,
  getErrorResult,
  logBackendError,
  handleJoinCode,
  getRequestJoinCodeEmbed,
  logAxiosResponse,
};
