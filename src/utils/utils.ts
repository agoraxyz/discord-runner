import { AxiosResponse } from "axios";
import {
  GuildMember,
  DiscordAPIError,
  MessageButton,
  MessageActionRow,
  MessageEmbed,
  Guild,
  Collection,
  GuildChannel,
  Permissions,
  MessageOptions,
} from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
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
    logger.verbose(error.response.data.errors[0].msg);
  } else if (error.response?.data) {
    logger.verbose(JSON.stringify(error.response.data));
  } else {
    logger.verbose(JSON.stringify(error));
  }
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  logger.verbose(
    `${res.status} ${res.statusText} data:${JSON.stringify(res.data)}`
  );
};

const isNumber = (value: any) =>
  typeof value === "number" && Number.isFinite(value);

const createJoinInteractionPayload = (
  guild: {
    name: string;
    urlName: string;
    description: string;
    themeColor: string;
    imageUrl: string;
  },
  title: string = "Verify your wallet",
  messageText: string = null,
  buttonText: string = `Join ${guild?.name || "Guild"}`
) => {
  const joinButton = new MessageButton({
    customId: "join-button",
    label: buttonText,
    emoji: "🔗",
    style: "PRIMARY",
  });
  const guideButton = new MessageButton({
    label: "Guide",
    url: "https://docs.guild.xyz/",
    style: "LINK",
  });
  const row = new MessageActionRow({ components: [joinButton, guideButton] });
  return {
    embeds: [
      new MessageEmbed({
        title,
        url: `${config.guildUrl}/${guild.urlName}`,
        description:
          messageText ||
          guild.description ||
          "Join this guild and get your role(s)!",
        color: `#${config.embedColor}`,
        author: {
          name: "Early boomer",
          iconURL: encodeURI(
            guild.imageUrl?.startsWith("https")
              ? guild.imageUrl
              : "https://cdn.discordapp.com/attachments/950682012866465833/951448319169802250/kerek.png"
          ),
        },
        thumbnail: {
          url: "https://cdn.discordapp.com/attachments/950682012866465833/951448318976884826/dc-message.png",
        },
        footer: {
          text: "Do not share your private keys. We will never ask for your seed phrase.",
        },
      }),
    ],
    components: [row],
  };
};

const getAccessedChannelsByRoles = (guild: Guild, accessedRoles: string[]) =>
  guild.channels.cache.filter(
    (channel) =>
      channel.type !== "GUILD_CATEGORY" &&
      !channel.isThread() &&
      channel.permissionOverwrites.cache.some(
        (po) =>
          accessedRoles.some((ar) => ar === po.id) &&
          po.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      )
  ) as Collection<string, GuildChannel>;

const getJoinReplyMessage = async (
  roleIds: string[],
  guild: Guild,
  userId: string
): Promise<MessageOptions> => {
  let message: MessageOptions;
  if (roleIds && roleIds.length !== 0) {
    const channelIds = getAccessedChannelsByRoles(guild, roleIds).map(
      (c) => c.id
    );

    if (channelIds.length === 0) {
      const roleNames = guild.roles.cache
        .filter((role) => roleIds.some((roleId) => roleId === role.id))
        .map((role) => role.name);
      message = {
        content: `✅ You got the \`${roleNames.join(", ")}\` role${
          roleNames.length > 1 ? "s" : ""
        }.`,
      };
    } else if (channelIds.length === 1) {
      message = {
        content: `✅ You got access to this channel: <#${channelIds[0]}>`,
      };
    } else {
      message = {
        content: `✅ You got access to these channels:\n${channelIds
          .map((c: string) => `<#${c}>`)
          .join("\n")}`,
      };
    }
  } else if (roleIds) {
    message = {
      content: "❌ You don't have access to any guilds in this server.",
    };
  } else {
    const guildsOfServer = await getGuildsOfServer(guild.id);

    const button = new MessageButton({
      label: "Join",
      style: "LINK",
      url: `${config.guildUrl}/${guildsOfServer[0].urlName}/?discordId=${userId}`,
    });

    return {
      components: [new MessageActionRow({ components: [button] })],
      content: `This is **your** join link. Do **NOT** share it with anyone!`,
    };
  }

  return message;
};

export {
  getUserResult,
  getErrorResult,
  logBackendError,
  logAxiosResponse,
  isNumber,
  createJoinInteractionPayload,
  getJoinReplyMessage,
  getAccessedChannelsByRoles,
};
