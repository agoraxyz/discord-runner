/* eslint-disable no-unused-vars */
import * as dotenv from "dotenv";

const envFound = dotenv.config();
/* if (envFound.error) {
  throw new Error("Couldn't find .env file or volumes in compose.");
} */

const redisHost = process.env.REDIS_HOST;
const hmacAlgorithm = process.env.HMAC_ALGORITHM || "sha256";
const hmacSecret = process.env.HMAC_SECRET;
const discordToken = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const api = {
  prefix: "/api",
  port: process.env.PORT || 8990,
};
const embedColor = process.env.EMBED_COLOR || "6366f1";

if (!discordToken)
  throw new Error(
    "You need to specify the bot's DISCORD_TOKEN in the .env file."
  );

if (!backendUrl)
  throw new Error("You need to specify the BACKEND_URL in the .env file.");

if (!redisHost)
  throw new Error("You need to specify the REDIS_HOST in the .env file.");

if (!hmacSecret)
  throw new Error("You need to specify the HMAC_SECRET in the .env file.");

export default {
  redisHost,
  hmacAlgorithm,
  hmacSecret,
  discordToken,
  backendUrl,
  api,
  embedColor,
};
