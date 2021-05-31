import express from "express";
import config from "../config";
import logger from "../utils/logger";
import router from "./router";

export default () => {
  const api = express();

  api.use(express.json());
  // app.use(cors()) // TODO: is this even neccessary?
  api.use(config.api.prefix, router());

  api.listen(config.api.port, () =>
    logger.info(`API listening on ${config.api.port}`)
  );

  return api;
};