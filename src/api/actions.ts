import { Collection, GuildMember, Role } from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import {
  ActionError,
  CreateRoleResult,
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

const generateInvite = async (guildId: string): Promise<InviteResult> => {
  logger.verbose(`generateInvite params: ${guildId}`);
  const cachedInviteCode = Main.inviteCodeCache.get(guildId);
  logger.verbose(`cached invite code: ${cachedInviteCode}`);
  if (cachedInviteCode) {
    return {
      code: cachedInviteCode,
    };
  }

  const guild = await Main.Client.guilds.fetch(guildId);
  const invite = await guild.systemChannel.createInvite({ maxAge: 0 });
  logger.verbose(`generated invite code: ${invite.code}`);

  Main.inviteCodeCache.set(guildId, invite.code);

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
    reason: "Created by Medousa for a community level.",
  });
  logger.verbose(`role created: ${role.id}`);

  return { id: role.id };
};

export { manageRoles, generateInvite, isMember, removeUser, createRole };
