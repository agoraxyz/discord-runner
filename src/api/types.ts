type ManageRolesParams = {
  guildId: string;
  userHash: string;
  roleName: string;
  message: string;
};

type CreateChannelParams = {
  guildId: string;
  roleId: string;
  channelName: string;
  categoryName?: string;
};

type DeleteChannelAndRoleParams = {
  guildId: string;
  roleId: string;
  channelName: string;
};

type UserResult = {
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
};

type InviteResult = {
  code: string;
};

type ErrorResult = {
  errors: { msg: string; value: string[] }[];
};

class ActionError extends Error {
  ids: string[];

  constructor(message: string, ids: string[]) {
    super(message);
    this.ids = ids;
  }
}

type CreateRoleResult = {
  id: string;
};

type DiscordChannel = {
  id: string;
  name: string;
};

type LevelInfo = {
  name: string;
  discordServerId: string;
  levels: string[];
  accessedRoles: string[];
  notAccessedRoles: string[];
};

type InviteData = {
  code: string;
  inviteChannelId: string;
};

export {
  ManageRolesParams,
  CreateChannelParams,
  DeleteChannelAndRoleParams,
  UserResult,
  InviteResult,
  ErrorResult,
  ActionError,
  CreateRoleResult,
  DiscordChannel,
  LevelInfo,
  InviteData,
};
