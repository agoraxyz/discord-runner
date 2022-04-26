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
  Role,
} from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import Main from "../Main";
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
  buttonText?: string
) => {
  const joinButton = new MessageButton({
    customId: "join-button",
    label: buttonText || `Join ${guild?.name || "Guild"}`,
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
        url: guild ? `${config.guildUrl}/${guild?.urlName}` : null,
        description:
          messageText ||
          guild?.description ||
          "Join this guild and get your role(s)!",
        color: `#${config.embedColor}`,
        author: {
          name: guild?.name || "Guild",
          iconURL: encodeURI(
            guild?.imageUrl?.startsWith("https")
              ? guild?.imageUrl
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
  logger.verbose(`getJoinReply - ${roleIds} ${guild.id} ${userId}`);
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
  } else if (roleIds && roleIds[0] !== "") {
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

const denyViewEntryChannelForRole = async (
  role: Role,
  entryChannelId: string
) => {
  try {
    const entryChannel = role.guild.channels.cache.get(
      entryChannelId
    ) as GuildChannel;
    if (
      !entryChannel.permissionOverwrites.cache
        .get(role.id)
        ?.deny.has(Permissions.FLAGS.VIEW_CHANNEL)
    ) {
      await entryChannel.permissionOverwrites.create(role.id, {
        VIEW_CHANNEL: false,
      });
    }
  } catch (error) {
    logger.warn(error);
    throw new Error(
      `Entry channel does not exists. (server: ${role.guild.id}, channel: ${entryChannelId})`
    );
  }
};

const getChannelsByCategoryWithRoles = (guild: Guild) => {
  // get the roles that can view channels
  const defaultRoles = guild.roles.cache
    .filter(
      (r) =>
        !r.permissions.has("ADMINISTRATOR") && r.permissions.has("VIEW_CHANNEL")
    )
    .map((r) => r.id);

  // sort channels by categoryId
  const channelsByCategoryId = guild.channels.cache.reduce<
    Map<string, { id: string; name: string; roles: string[] }[]>
  >((acc, ch) => {
    // skip if not text or news channel
    if (ch.type !== "GUILD_TEXT" && ch.type !== "GUILD_NEWS") {
      return acc;
    }

    // handle where threre is not parent
    const parentId = ch.parent?.id || "-";

    // create parentId key if not exists
    if (!acc.has(parentId)) {
      acc.set(parentId, []);
    }

    // update viewer roles according to permission overwrites
    let roles: Set<string>;
    if (
      ch.permissionOverwrites.cache
        .get(guild.roles.everyone.id)
        ?.deny?.has("VIEW_CHANNEL")
    ) {
      roles = new Set();
    } else {
      roles = new Set(defaultRoles);
    }
    ch.permissionOverwrites.cache.forEach((po) => {
      if (po.type === "role") {
        if (po.allow.has("VIEW_CHANNEL")) {
          roles.add(po.id);
        }
        if (po.deny.has("VIEW_CHANNEL")) {
          roles.delete(po.id);
        }
      }
    });

    // add channel info to the category's array
    acc.get(parentId).push({
      id: ch.id,
      name: ch.name,
      roles: [...roles],
    });
    return acc;
  }, new Map());

  // add categoryName and convert to array
  const channelsByCategory = [];
  channelsByCategoryId.forEach((v, k) => {
    channelsByCategory.push({
      id: k,
      name: k === "-" ? "-" : guild.channels.cache.get(k).name,
      channels: v,
    });
  });

  return channelsByCategory;
};

const updateAccessedChannelsOfRole = (
  serverId: string,
  roleId: string,
  channelIds: string[]
) => {
  const shouldHaveAccess = new Set(channelIds);

  const channels = Main.Client.guilds.cache
    .get(serverId)
    ?.channels.cache.filter((channel) => !channel.isThread()) as Collection<
    string,
    GuildChannel
  >;

  const [channelsToAllow, channelsToDeny] = channels.partition(
    (channel) =>
      shouldHaveAccess.has(channel.id) || shouldHaveAccess.has(channel.parentId)
  );

  return Promise.all([
    ...channelsToDeny.map((channelToDenyAccessTo) =>
      channelToDenyAccessTo.permissionOverwrites.create(roleId, {
        VIEW_CHANNEL: false,
      })
    ),
    ...channelsToAllow.map((channelToAllowAccessTo) =>
      channelToAllowAccessTo.permissionOverwrites.create(roleId, {
        VIEW_CHANNEL: true,
      })
    ),
  ]);
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
  denyViewEntryChannelForRole,
  getChannelsByCategoryWithRoles,
  updateAccessedChannelsOfRole,
};
