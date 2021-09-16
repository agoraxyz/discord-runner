import { Collection, Guild, GuildMember, Permissions, Role } from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import {
  ActionError,
  CreateRoleResult,
  DiscordChannel,
  InviteResult,
  ManageRolesParams,
  UserResult,
} from "./types";
import { getUserResult } from "../utils/utils";

const manageRoles = async (
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult> => {
  logger.verbose(`manageRoles params: ${JSON.stringify(params)}, ${isUpgrade}`);
  const guild = await Main.Client.guilds.fetch(params.guildId);

  const member = await guild.members.fetch(params.userId);

  const roleManager = await guild.roles.fetch();

  const rolesToManage: Collection<string, Role> = roleManager.cache.filter(
    (role) => params.roleIds.includes(role.id)
  );

  if (rolesToManage.size !== params.roleIds.length) {
    const missingRoleIds = params.roleIds.filter(
      (roleId) => !rolesToManage.map((role) => role.id).includes(roleId)
    );
    throw new ActionError("missing role(s)", missingRoleIds);
  }

  if (
    (isUpgrade &&
      params.roleIds.some((roleId) => !member.roles.cache.has(roleId))) ||
    (!isUpgrade &&
      params.roleIds.some((roleId) => member.roles.cache.has(roleId)))
  ) {
    let updatedMember: GuildMember;
    if (isUpgrade) {
      updatedMember = await member.roles.add(rolesToManage);
    } else {
      updatedMember = await member.roles.remove(rolesToManage);
    }

    updatedMember.send(params.message).catch(logger.error);

    return getUserResult(updatedMember);
  }

  return getUserResult(member);
};

const generateInvite = async (
  guildId: string,
  inviteChannelId: string
): Promise<InviteResult> => {
  logger.verbose(`generateInvite params: ${guildId}`);
  const cachedInvite = Main.inviteDataCache.get(guildId);
  logger.verbose(`cached invite code: ${cachedInvite?.code}`);

  if (cachedInvite && cachedInvite.inviteChannelId === inviteChannelId) {
    return {
      code: cachedInvite.code,
    };
  }

  const guild = await Main.Client.guilds.fetch(guildId);
  const channel = guild.channels.cache.find((c) => c.id === inviteChannelId);
  if (!channel) {
    throw new ActionError("Invite channel not found.", [inviteChannelId]);
  }

  const invite = await channel.createInvite({ maxAge: 0 });
  logger.verbose(`generated invite code: ${invite.code}`);

  Main.inviteDataCache.set(guildId, {
    code: invite.code,
    inviteChannelId: channel.id,
  });

  if (cachedInvite && cachedInvite.inviteChannelId !== inviteChannelId) {
    logger.verbose(`deleting old invite: ${cachedInvite.code}`);
    guild.fetchInvites().then((invites) => {
      invites
        .find((i) => i.code === cachedInvite.code)
        ?.delete()
        .catch(logger.error);
    });
  }

  return {
    code: invite.code,
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

const createRole = async (
  guildId: string,
  roleName: string
): Promise<CreateRoleResult> => {
  logger.verbose(`createRole params: ${guildId}, ${roleName}`);
  const guild = await Main.Client.guilds.fetch(guildId);

  const role = await guild.roles.create({
    data: { name: roleName, hoist: true },
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
    `Updated by ${Main.Client.user.username} because the level name changed in Agora Space.`
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

const listChannels = async (
  guildId: string
): Promise<DiscordChannel[] | undefined> => {
  logger.verbose(`listChannels params: ${guildId}`);
  let guild: Guild;
  try {
    guild = await Main.Client.guilds.fetch(guildId);
  } catch (error) {
    if (error.code === 50001) {
      logger.verbose(`listChannels: guild not found`);
      throw new ActionError("Guild not found.", [guildId]);
    }
    throw error;
  }

  const channels = guild.channels.cache
    .filter(
      (c) =>
        c.type === "text" &&
        c
          .permissionsFor(guild.roles.everyone)
          .has(Permissions.FLAGS.VIEW_CHANNEL)
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      category: c.parent.name.toUpperCase(),
    }));

  logger.verbose(`listChannels result: ${JSON.stringify(channels)}`);
  return channels;
};

const listAdministeredServers = async (userId: string) => {
  logger.verbose(`listAdministeredServers params: ${userId}`);

  const administeredServers = Main.Client.guilds.cache
    .filter((g) => g.member(userId)?.hasPermission("ADMINISTRATOR"))
    .map((g) => ({ name: g.name, id: g.id }));

  logger.verbose(`listAdministeredServers result: ${administeredServers}`);
  return administeredServers;
};

const isGuildMember = async (guildId: string, roleId: string, userId: string) => {
  logger.verbose(`isGuildMember params - guildId: ${guildId} roleId: ${roleId} userId: ${userId}`);
  const guild = await Main.Client.guilds.fetch(guildId);
  const user = await guild.members.fetch(userId);
  const result = user.roles.cache.some((r) => r.id === roleId);

  logger.verbose(`isGuildMember result: ${result}`);
  return result;
};

export {
  manageRoles,
  generateInvite,
  isMember,
  removeUser,
  createRole,
  updateRoleName,
  isIn,
  listChannels,
  listAdministeredServers,
  isGuildMember,
};
