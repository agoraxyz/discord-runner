type ManageRolesParams = {
  guildId: string;
  platformUserId: string;
  roleId: string;
  message: string;
};

type CreateChannelParams = {
  guildId: string;
  channelName: string;
};

type DeleteChannelAndRoleParams = {
  guildId: string;
  roleId: string;
  channelId: string;
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
  accessedRoles: string;
};

type InviteData = {
  code: string;
  inviteChannelId: string;
};

type SendJoinMeta = Partial<{
  title: string;
  description: string;
  button: string;
}>;

export {
  SendJoinMeta,
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
