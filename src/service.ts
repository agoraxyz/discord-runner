import axios from "axios";
import { LevelInfo } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse, logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;

const userJoined = async (platformUserId: string, serverId: string) => {
  logger.verbose(`userJoined params: ${platformUserId}, ${serverId}`);
  try {
    logger.verbose(`userJoined userId - ${platformUserId}`);

    const response = await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      platform: config.platform,
      platformUserId,
      serverId,
    });

    logger.verbose(`joinedPlatform result:`);

    logAxiosResponse(response);

    return response.data;
  } catch (error) {
    logger.verbose("joinedPlatform error");
    logBackendError(error);
    return null;
  }
};

const userRemoved = async (platformUserId: string, serverId: string) => {
  logger.verbose(`userRemoved userId - ${platformUserId}`);

  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: config.platform,
      platformUserId,
      serverId,
      triggerKick: false,
    })
    .catch(logBackendError);
};

const statusUpdate = async (
  platformUserId: string
): Promise<LevelInfo[] | undefined> => {
  logger.verbose(`statusUpdate params: ${platformUserId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/user/statusUpdate`, {
      discordId: platformUserId,
    });
    logAxiosResponse(response);
    return response.data;
  } catch (error) {
    logger.verbose("statusUpdate error");
    logBackendError(error);
    return undefined;
  }
};

const getGuildsOfServer = async (serverId: string) => {
  logger.verbose(`getGuildsOfServer params: ${serverId}`);
  try {
    const response = await axios.get(
      `${API_BASE_URL}/guild/platformId/${serverId}`
    );
    logAxiosResponse(response);
    return [response.data];
  } catch (error) {
    logger.verbose("getGuildsOfServer error");
    return [];
  }
};

const guildStatusUpdate = async (guildId: number): Promise<boolean> => {
  logger.verbose(`guildStatusUpdate: ${guildId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/role/statusUpdate`, {
      guildId,
    });
    logAxiosResponse(response);
    return response.data;
  } catch (error) {
    logger.verbose("guildStatusUpdate error");
    logBackendError(error);
    return undefined;
  }
};

export {
  userJoined,
  userRemoved,
  statusUpdate,
  getGuildsOfServer,
  guildStatusUpdate,
};
