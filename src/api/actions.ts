import {
  GuildMember,
  PartialGuildMember,
  Role,
  Permissions,
  GuildChannel,
  MessageEmbed,
  Channel,
  TextChannel,
} from "discord.js";
import axios from "axios";
import Main from "../Main";
import logger from "../utils/logger";
import {
  CreateChannelParams,
  CreateRoleResult,
  DeleteChannelAndRoleParams,
  InviteResult,
  ManageRolesParams,
  UserResult,
} from "./types";
import {
  createJoinInteractionPayload,
  getAccessedChannelsByRoles,
  getErrorResult,
  getJoinReplyMessage,
  getUserResult,
} from "../utils/utils";
import config from "../config";
import { getGuildsOfServer } from "../service";
import redisClient from "../database";

const DiscordServerNames: { [guildId: string]: [name: string] } = {};

const notifyAccessedChannels = async (
  member: GuildMember | PartialGuildMember,
  roleId: string,
  guildName: string
) => {
  const accessedChannels = getAccessedChannelsByRoles(member.guild, [roleId]);

  const sortedChannels = accessedChannels.reduce<
    Map<string | null, GuildChannel[]>
  >((acc, value) => {
    let channels = acc.get(value?.parent?.name);
    if (!channels) {
      channels = [];
    }
    channels.push(value);
    acc.set(value?.parent?.name, channels);
    return acc;
  }, new Map());

  let message: string;
  if (accessedChannels.size === 0) {
    message = `You got access to the \`${guildName}\` role in \`${member.guild.name}\`.`;
  } else {
    message = `You got access to ${
      accessedChannels.size > 1 ? "these channels" : "this channel"
    } with the \`${guildName}\` role in \`${member.guild.name}\`:`;
  }

  const embed = new MessageEmbed({
    title: message,
    color: `#${config.embedColor}`,
  });

  const categoryEmoji = Main.Client.emojis.cache.get("893836008712441858");
  const privateChannelEmoji =
    Main.Client.emojis.cache.get("893836025699377192");

  sortedChannels.forEach((channel, key) => {
    const fieldValue = channel
      .map(
        (c) =>
          `[${privateChannelEmoji || ""}${
            c.name
          }](https://discord.com/channels/${member.guild.id}/${c.id})`
      )
      .join("\n");
    embed.addField(
      `${categoryEmoji || ""}${key || "Without Category"}`,
      fieldValue.length < 1025 ? fieldValue : fieldValue.substring(0, 1024)
    );
  });

  member.send({ embeds: [embed] }).catch(logger.error);
};

const manageRoles = async (
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult> => {
  logger.verbose(`manageRoles params: ${JSON.stringify(params)}, ${isUpgrade}`);
  const { platformUserId: userId, guildId, roleId, message } = params;

  const guild = await Main.Client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  const redisKey = `joining:${member.guild.id}:${member.id}`;
  const redisValue: string = await redisClient.getAsync(redisKey);
  if (redisValue) {
    const messageText = await getJoinReplyMessage(
      [roleId],
      member.guild,
      member.id
    );

    try {
      await axios.patch(
        `https://discord.com/api/v8/webhooks/${Main.Client.application.id}/${redisValue}/messages/@original`,
        { content: messageText }
      );
      redisClient.client.del(redisKey);
    } catch (err) {
      logger.error(err);
    }
  }

  const hasRole = member.roles.cache.has(roleId);

  if ((isUpgrade && !hasRole) || (!isUpgrade && hasRole)) {
    let updatedMember: GuildMember;
    if (isUpgrade) {
      updatedMember = await member.roles.add(roleId);
    } else {
      updatedMember = await member.roles.remove(roleId);
      const embed = new MessageEmbed({
        title: `You no longer have access to the \`${message}\` role in \`${guild.name}\`, because you have not fulfilled the requirements or just left it.`,
        color: `#${config.embedColor}`,
      });
      try {
        await updatedMember.send({ embeds: [embed] });
      } catch (error) {
        if (error?.code === 50007) {
          logger.verbose(
            `Cannot send messages to ${updatedMember.user.username}#${updatedMember.user.discriminator}`
          );
        } else {
          logger.error(JSON.stringify(error));
        }
      }
    }

    if (isUpgrade && !redisValue) {
      try {
        await notifyAccessedChannels(updatedMember, roleId, message);
      } catch (error) {
        logger.error(error);
      }
    }

    return getUserResult(updatedMember);
  }

  return getUserResult(member);
};

const generateInvite = async (
  guildId: string,
  inviteChannelId: string
): Promise<InviteResult> => {
  logger.verbose(`generateInvite params: ${guildId} ${inviteChannelId}`);
  const cachedInvite = Main.inviteDataCache.get(guildId);
  logger.verbose(`cached invite code: ${cachedInvite?.code}`);

  if (cachedInvite) {
    return {
      code: cachedInvite.code,
    };
  }

  const guild = await Main.Client.guilds.fetch(guildId);
  const invite = guild.invites.cache.first();

  if (invite?.code) {
    Main.inviteDataCache.set(guildId, {
      code: invite.code,
      inviteChannelId: invite.channel.id,
    });
    logger.verbose(`generated invite code: ${invite?.code}`);
    return {
      code: invite.code,
    };
  }
  const newInvite = await guild.invites.create(inviteChannelId, { maxAge: 0 });
  logger.verbose(`generated invite code: ${newInvite?.code}`);
  Main.inviteDataCache.set(guildId, {
    code: newInvite.code,
    inviteChannelId,
  });
  return {
    code: newInvite.code,
  };
};

const isMember = async (
  guildId: string,
  userId: string
): Promise<UserResult> => {
  const guild = await Main.Client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  return getUserResult(member);
};

const removeUser = async (guildId: string, userId: string): Promise<void> => {
  const guild = await Main.Client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  await member.kick();
};

const createChannel = async (params: CreateChannelParams) => {
  logger.verbose(`createChannel params: ${JSON.stringify(params)}`);
  const { guildId, roleId, channelName } = params;
  const guild = await Main.Client.guilds.fetch(guildId);

  const everyone = guild.roles.cache.find((r) => r.name === "@everyone");
  logger.verbose(`createChannel params: ${JSON.stringify(everyone)}`);

  const createdChannel = await guild.channels.create(channelName, {
    type: "GUILD_TEXT",
  });
  const category = guild.channels.cache.find(
    (c) => c.name.toUpperCase() === "GUILDS-3" && c.type === "GUILD_CATEGORY"
  );

  await (
    guild.channels.cache.find(
      (c) => c.name === createdChannel.name && !c.isThread()
    ) as GuildChannel
  ).setParent(category.id);

  createdChannel.permissionOverwrites.set([
    {
      id: everyone.id,
      deny: Permissions.FLAGS.VIEW_CHANNEL,
    },
    {
      id: roleId,
      allow: [
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.ATTACH_FILES,
        Permissions.FLAGS.EMBED_LINKS,
        Permissions.FLAGS.READ_MESSAGE_HISTORY,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
        Permissions.FLAGS.VIEW_CHANNEL,
      ],
      deny: [Permissions.FLAGS.CREATE_INSTANT_INVITE],
    },
  ]);
  return createdChannel;
};

const deleteRole = async (guildId: string, roleId: string): Promise<Role> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const deletedRole = guild.roles.cache.find((r) => r.id === roleId).delete();
  return deletedRole;
};

const deleteChannel = async (
  guildId: string,
  channelId: string
): Promise<Channel> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const deletedChannel = guild.channels.cache
    .find((r) => r.id === channelId)
    .delete();
  return deletedChannel;
};

const deleteChannelAndRole = async (
  params: DeleteChannelAndRoleParams
): Promise<boolean> => {
  logger.verbose(`deleteChannelAndRole params: ${JSON.stringify(params)}`);
  const { guildId, roleId, channelId } = params;

  try {
    await deleteRole(guildId, roleId);
    await deleteChannel(guildId, channelId);
    return true;
  } catch (error) {
    logger.error(getErrorResult(error));
    return false;
  }
};

const createRole = async (
  guildId: string,
  roleName: string
): Promise<CreateRoleResult> => {
  logger.verbose(`createRole params: ${guildId}, ${roleName}`);
  const guild = await Main.Client.guilds.fetch(guildId);

  const role = await guild.roles.create({
    name: roleName,
    hoist: true,
    reason: `Created by ${Main.Client.user.username} for an Agora Space community level.`,
  });
  logger.verbose(`role created: ${role.id}`);

  return { id: role.id };
};

const updateRoleName = async (
  guildId: string,
  roleId: string,
  newRoleName: string
) => {
  logger.verbose(
    `updateRoleName params: ${guildId}, ${roleId}, ${newRoleName}`
  );
  const guild = await Main.Client.guilds.fetch(guildId);

  const role = await guild.roles.fetch(roleId);

  const updatedRole = await role.edit(
    { name: newRoleName },
    `Updated by ${Main.Client.user.username} because the role name has changed in Guild.`
  );

  return updatedRole;
};

const isIn = async (guildId: string): Promise<boolean> => {
  logger.verbose(`isIn params: ${guildId}`);

  try {
    await Main.Client.guilds.fetch(guildId);
    logger.verbose("isIn: true");
    return true;
  } catch (error) {
    if (error.code === 50001) {
      logger.verbose("isIn: false");
      return false;
    }
    logger.verbose("isIn: error");
    throw error;
  }
};

const listChannels = async (guildId: string) => {
  logger.verbose(`listChannels params: ${guildId}`);
  try {
    const guild = await Main.Client.guilds.fetch(guildId);
    logger.verbose(`${JSON.stringify(guild)}`);
    const { icon: iconId, name: serverName } = guild;
    const serverIcon =
      iconId === null
        ? ""
        : `https://cdn.discordapp.com/icons/${guildId}/${iconId}.png`;

    if (
      !guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
      !guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)
    ) {
      return {
        serverIcon,
        serverName,
        serverId: guildId,
        channels: [],
        roles: [],
        isAdmin: false,
      };
    }

    const channels = guild?.channels.cache
      .filter(
        (c) =>
          c.type === "GUILD_TEXT" &&
          c
            .permissionsFor(guild.roles.everyone)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
      )
      .map((c) => ({
        id: c?.id,
        name: c?.name,
      }));

    const roles = guild?.roles.cache.filter((r) => r.name !== "@everyone");

    logger.verbose(`listChannels result: ${JSON.stringify(channels)}`);
    return {
      serverIcon,
      serverName,
      serverId: guildId,
      channels,
      roles,
      isAdmin: true,
    };
  } catch (error) {
    return {
      serverIcon: "",
      serverName: "",
      serverId: guildId,
      channels: [],
      roles: [],
      isAdmin: null,
    };
  }
};

const listAdministeredServers = async (userId: string) => {
  logger.verbose(`listAdministeredServers params: ${userId}`);

  const administeredServers = Main.Client.guilds.cache
    .filter((g) =>
      g.members.cache.get(userId)?.permissions.has("ADMINISTRATOR")
    )
    .map((g) => ({ name: g.name, id: g.id }));

  logger.verbose(`listAdministeredServers result: ${administeredServers}`);
  return administeredServers;
};

const getGuild = async (guildId: string) => {
  if (DiscordServerNames[guildId]) {
    return DiscordServerNames[guildId];
  }
  const guild = await Main.Client.guilds.fetch(guildId);
  DiscordServerNames[guildId] = guild.name as any;
  return guild.name;
};

const getRole = async (guildId: string, roleId: string) => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const role = guild.roles.cache.find((r) => r.id === roleId);
  return { serverName: guild.name, roleName: role.name };
};

const sendJoinButton = async (guildId: string, channelId: string) => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const channel = guild.channels.cache.find((c) => c.id === channelId);
  const guilds = await getGuildsOfServer(guildId);
  const payload = createJoinInteractionPayload(guilds[0]);

  const message = await (<TextChannel>channel).send(payload);
  await message.react(config.joinButtonEmojis.emoji1);
  await message.react(config.joinButtonEmojis.emoji2);

  return true;
};

const getServerOwner = async (guildId: string, userId: string) => {
  const guild = await Main.Client.guilds.fetch(guildId);
  return guild.members.cache.get(userId)?.permissions.has("ADMINISTRATOR");
};

const getUser = async (userId: string) => Main.Client.users.fetch(userId);

const manageMigratedActions = async (
  guildId: string,
  userIds: string[],
  roleId: string,
  message: string
) => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const role = guild.roles.cache.find((r) => r.id === roleId);
  await Promise.all(
    userIds.map(async (id) => {
      const member = await guild.members.fetch(id);
      await member.roles.add(roleId);
      await notifyAccessedChannels(member, roleId, message);
    })
  );

  await Promise.all(
    role.members.map(async (m) => {
      if (!userIds.includes(m.id)) {
        await m.roles.remove(roleId);
        const embed = new MessageEmbed({
          title: `You no longer have access to the \`${message}\` role in \`${guild.name}\`, because you have not fulfilled the requirements or just left it.`,
          color: `#${config.embedColor}`,
        });
        try {
          await m.send({ embeds: [embed] });
        } catch (error) {
          if (error?.code === 50007) {
            logger.verbose(
              `Cannot send messages to ${m.user.username}#${m.user.discriminator}`
            );
          } else {
            logger.error(JSON.stringify(error));
          }
        }
      }
    })
  );
};

export {
  manageRoles,
  manageMigratedActions,
  generateInvite,
  isMember,
  removeUser,
  createRole,
  updateRoleName,
  isIn,
  listChannels,
  listAdministeredServers,
  createChannel,
  getGuild,
  getRole,
  deleteChannelAndRole,
  deleteRole,
  sendJoinButton,
  getServerOwner,
  getUser,
};
