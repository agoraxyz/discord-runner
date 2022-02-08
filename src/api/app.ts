import express, { RequestHandler } from "express";
import config from "../config";

import router from "./router";

const app = express();

app.use(express.json({ limit: "6mb" }) as RequestHandler);

app.use(express.json());

app.use(config.api.prefix, router);

export default app;
