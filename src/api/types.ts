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

type SelectMenuOption = {
  label: string;
  description: string;
  value: string;
};

type RequirementDict = { [k: string]: SelectMenuOption[] };

type NewPoll = {
  roles: SelectMenuOption[];
  requirements: RequirementDict;
  requirementId: number;
  channelId: string;
  question: string;
  options: string[];
  reactions: string[];
  expDate: string;
};

type Poll = {
  id: number;
  question: string;
  startDate: number;
  expDate: number;
  options: string[];
  reactions: string[];
  roleId: number;
};

type Reaction = {
  name: string;
  users: string[];
};

type Vote = {
  platform: "DISCORD" | "TELEGRAM";
  pollId: number;
  platformUserId: string;
  optionIndex: number;
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
  SelectMenuOption,
  RequirementDict,
  NewPoll,
  Poll,
  Reaction,
  Vote,
};
