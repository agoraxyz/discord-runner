import { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import { DiscordAPIError, GuildMember } from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import redisClient from "../database";
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
  } else if (error.response?.data) {
    logger.error(error.response.data);
  } else {
    logger.error(error);
  }
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  logger.verbose(
    `${res.status} ${res.statusText} data:${JSON.stringify(res.data)}`
  );
};

const getUserHash = async (platformUserId: string): Promise<string> => {
  const hmac = createHmac(config.hmacAlgorithm, config.hmacAlgorithm);
  hmac.update(platformUserId);
  const hashedId = hmac.digest("base64");
  const user = await redisClient.getAsync(hashedId);
  if (!user) {
    redisClient.client.SET(hashedId, platformUserId);
  }
  return hashedId;
};

const getUserPlatformId = async (
  userHash: string
): Promise<string | undefined> => {
  const platformUserId = await redisClient.getAsync(userHash);
  return platformUserId || undefined;
};

export {
  getUserResult,
  getErrorResult,
  logBackendError,
  logAxiosResponse,
  getUserHash,
  getUserPlatformId,
};
