import { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import {
  GuildMember,
  DiscordAPIError,
  MessageButton,
  MessageActionRow,
  MessageEmbed,
  ColorResolvable,
} from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import redisClient from "../database";
import { getGuildsOfServer } from "../service";
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
      errorMsg = `discord api error: ${error.message}`;
    }
  } else if (error instanceof ActionError) {
    errorMsg = error.message;
    ids = error.ids;
  } else {
    logger.error(error);
    errorMsg = error.message;
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
    logger.error(JSON.stringify(error.response.data));
  } else {
    logger.error(JSON.stringify(error));
  }
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  logger.verbose(
    `${res.status} ${res.statusText} data:${JSON.stringify(res.data)}`
  );
};

const getUserHash = async (platformUserId: string): Promise<string> => {
  const hmac = createHmac(config.hmacAlgorithm, config.hmacSecret);
  hmac.update(platformUserId);
  const hashedId = hmac.digest("base64");
  const user = await redisClient.getAsync(hashedId);
  if (!user) {
    redisClient.client.SET(hashedId, platformUserId);
  }
  return hashedId;
};

const getUserDiscordId = async (
  userHash: string
): Promise<string | undefined> => {
  const platformUserId = await redisClient.getAsync(userHash);
  return platformUserId || undefined;
};

const isNumber = (value: any) =>
  typeof value === "number" && Number.isFinite(value);

const createJoinInteractionPayload = (
  guild: {
    name: string;
    urlName: string;
    description: string;
    themeColor: string;
  },
  messageText: string,
  buttonText: string
) => {
  const button = new MessageButton({
    customId: "join-button",
    label: buttonText || `Join ${guild?.name || "Guild"}`,
    emoji: "🔗",
    style: "PRIMARY",
  });
  const row = new MessageActionRow({ components: [button] });
  return {
    embeds: [
      new MessageEmbed({
        title: guild?.name || "Guild",
        url: `${config.guildUrl}/${guild.urlName}`,
        description: guild.description,
        color: guild.themeColor as ColorResolvable,
        footer: {
          text:
            messageText ||
            "Click the button to get access for the desired Guild(s)!",
        },
      }),
    ],
    components: [row],
  };
};

const getJoinReplyMessage = async (
  channelIds: string[],
  guildId: string,
  userId: string
) => {
  let message: string;
  if (channelIds && channelIds.length !== 0) {
    if (channelIds.length === 1) {
      message = `✅ You got access to this channel: <#${channelIds[0]}>`;
    } else {
      message = `✅ You got access to these channels:\n${channelIds
        .map((c: string) => `<#${c}>`)
        .join("\n")}`;
    }
  } else if (channelIds) {
    message = "❌ You don't have access to any guilds in this server.";
  } else {
    const guildsOfServer = await getGuildsOfServer(guildId);
    message = `${config.guildUrl}/${guildsOfServer[0].urlName}/?discordId=${userId}`;
  }

  return message;
};

export {
  getUserResult,
  getErrorResult,
  logBackendError,
  logAxiosResponse,
  getUserHash,
  getUserDiscordId,
  isNumber,
  createJoinInteractionPayload,
  getJoinReplyMessage,
};
