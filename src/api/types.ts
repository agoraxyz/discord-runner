type ManageRolesParams = {
  guildId: string;
  platformUserId: string;
  roleId: string;
  message: string;
};

type CreateChannelParams = {
  guildId: string;
  roleId: string;
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

type NewPoll = {
  // poll creation
  status: number;
  // Discord
  channelId: string;
  // poll
  question: string;
  options: string[];
  reactions: string[];
  endDate: string;
};

type Poll = {
  // Discord
  channelId: string;
  messageId: string;
  // poll
  question: string;
  options: string[];
  reactions: string[];
  endDate: string;
  // voting
  ended: boolean;
  voteCount: number;
  results: number[];
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
  NewPoll,
  Poll,
};
