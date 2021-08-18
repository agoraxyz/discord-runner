import axios from "axios";
import { LevelInfo } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import { getUserHash, logAxiosResponse, logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;
const PLATFORM = "DISCORD";

const userJoined = async (
  platformUserId: string,
  serverId: string
): Promise<boolean> => {
  logger.verbose(`userJoined params: ${platformUserId}, ${serverId}`);
  try {
    const userHash = await getUserHash(platformUserId);
    logger.verbose(`userJoined userHash - ${userHash}`);
    const response = await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      platform: PLATFORM,
      platformUserId: userHash,
      serverId,
    });
    logger.verbose(`joinedPlatform result:`);
    logAxiosResponse(response);
    return true;
  } catch (error) {
    logger.verbose("joinedPlatform error");
    logBackendError(error);
    return false;
  }
};

const userRemoved = async (dcUserId: string, serverId: string) => {
  const userHash = await getUserHash(dcUserId);
  logger.verbose(`userRemoved userHash - ${userHash}`);
  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: PLATFORM,
      platformUserId: userHash,
      serverId,
      triggerKick: false,
    })
    .catch(logBackendError);
};

const statusUpdate = async (
  discordId: string
): Promise<LevelInfo[] | undefined> => {
  logger.verbose(`statusUpdate params: ${discordId}`);
  const userHash = await getUserHash(discordId);
  logger.verbose(`statusUpdate userHash - ${userHash}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/user/statusUpdate`, {
      discordId: userHash,
    });
    logAxiosResponse(response);
    return response.data;
  } catch (error) {
    logger.verbose("statusUpdate error");
    logBackendError(error);
    return undefined;
  }
};

export { userJoined, userRemoved, statusUpdate };
