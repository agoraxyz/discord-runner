import { NewPoll, SelectMenuOption, RequirementDict } from "./types";

const pollOfUser: Map<string, NewPoll> = new Map();
const userStep: Map<string, number> = new Map();

const setUserStep = (userId: string, step: number): void => {
  userStep.set(userId, step);
};

const getUserStep = (userId: string): number => userStep.get(userId);

const initPoll = (userId: string, channelId: string): void => {
  pollOfUser.set(userId, {
    roles: [],
    requirements: {},
    requirementId: 0,
    channelId,
    question: "",
    options: [],
    reactions: [],
    expDate: "",
  });

  setUserStep(userId, 0);
};

const saveRoles = (userId: string, roles: SelectMenuOption[]): void => {
  const poll = pollOfUser.get(userId);

  poll.roles = roles;
  pollOfUser.set(userId, poll);
};

const saveRequirements = (
  userId: string,
  requirements: RequirementDict
): void => {
  const poll = pollOfUser.get(userId);

  poll.requirements = requirements;
  pollOfUser.set(userId, poll);
};

const saveReqId = (userId: string, requirementId: number): void => {
  const poll = pollOfUser.get(userId);

  poll.requirementId = requirementId;
  pollOfUser.set(userId, poll);
};

const savePollQuestion = (userId: string, question: string): void => {
  const poll = pollOfUser.get(userId);

  poll.question = question;
  pollOfUser.set(userId, poll);
};

const savePollOption = (userId: string, option: string): boolean => {
  const poll = pollOfUser.get(userId);

  if (poll.options.includes(option)) {
    return false;
  }

  poll.options.push(option);
  pollOfUser.set(userId, poll);

  return true;
};

const savePollReaction = (userId: string, reaction: string): boolean => {
  const poll = pollOfUser.get(userId);

  if (poll.reactions.includes(reaction)) {
    return false;
  }

  poll.reactions.push(reaction);
  pollOfUser.set(userId, poll);

  return true;
};

const savePollExpDate = (userId: string, expDate: string): void => {
  const poll = pollOfUser.get(userId);

  poll.expDate = expDate;
  pollOfUser.set(userId, poll);
};

const getPoll = (userId: string) => pollOfUser.get(userId);

const deleteMemory = (userId: string) => {
  userStep.set(userId, 0);
  pollOfUser.delete(userId);
};

export default {
  initPoll,
  setUserStep,
  getUserStep,
  saveRoles,
  saveRequirements,
  saveReqId,
  savePollQuestion,
  savePollOption,
  savePollReaction,
  savePollExpDate,
  getPoll,
  deleteMemory,
};
