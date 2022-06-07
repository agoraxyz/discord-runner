import express from "express";
import config from "../config";
import logger from "../utils/logger";
import router from "./router";

const createApi = () => {
  const api = express();
  api.disable("x-powered-by");

  api.use(express.json());
  api.use(config.api.prefix, router());

  api.listen(config.api.port, () =>
    logger.info(`API listening on ${config.api.port}`)
  );

  return api;
};

export default createApi;
