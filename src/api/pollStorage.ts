import { NewPoll, SelectMenuOption } from "./types";

const pollOfUser: Map<string, NewPoll> = new Map();
const userStep: Map<string, number> = new Map();

const setUserStep = (userId: string, step: number): void => {
  userStep.set(userId, step);
};

const getUserStep = (userId: string): number => userStep.get(userId);

const initPoll = (userId: string, channelId: string): void => {
  pollOfUser.set(userId, {
    roles: [],
    requirements: [],
    requirementId: 0,
    channelId,
    question: "",
    options: [],
    reactions: [],
    expDate: "",
  });

  setUserStep(userId, 0);
};

const saveRequirements = (
  userId: string,
  requirements: SelectMenuOption[]
): void => {
  pollOfUser.set(userId, { ...pollOfUser.get(userId), requirements });
};

const saveReqId = (userId: string, requirementId: number): void => {
  pollOfUser.set(userId, { ...pollOfUser.get(userId), requirementId });
};

const savePollQuestion = (userId: string, question: string): void => {
  pollOfUser.set(userId, { ...pollOfUser.get(userId), question });
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
  pollOfUser.set(userId, { ...pollOfUser.get(userId), expDate });
};

const getPoll = (userId: string): NewPoll => pollOfUser.get(userId);

const deleteMemory = (userId: string): void => {
  userStep.set(userId, 0);
  pollOfUser.delete(userId);
};

export default {
  initPoll,
  setUserStep,
  getUserStep,
  saveRequirements,
  saveReqId,
  savePollQuestion,
  savePollOption,
  savePollReaction,
  savePollExpDate,
  getPoll,
  deleteMemory,
};
