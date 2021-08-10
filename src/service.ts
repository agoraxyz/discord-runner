import axios from "axios";
import { LevelInfo } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse, logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;
const PLATFORM = "DISCORD";

const userJoined = async (
  platformUserId: string,
  serverId: string
): Promise<boolean> => {
  logger.verbose(`userJoined params: ${platformUserId}, ${serverId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      platform: PLATFORM,
      platformUserId,
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

const userRemoved = (dcUserId: string, serverId: string): void => {
  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: PLATFORM,
      platformUserId: dcUserId,
      serverId,
      triggerKick: false,
    })
    .catch(logBackendError);
};

const statusUpdate = async (
  discordId: string
): Promise<LevelInfo[] | undefined> => {
  logger.verbose(`statusUpdate params: ${discordId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/user/statusUpdate`, {
      discordId,
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
