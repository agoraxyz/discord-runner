import { Router } from "express";
import { body } from "express-validator";
import controller from "./controller";
import validators from "./validators";

const createRouter = () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("userId"),
    validators.roleIdsArrayValidator,
    validators.bodyDiscordId("roleIds.*"),
    validators.messageValidator,
    controller.upgrade
  );

  router.post(
    "/downgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("userId"),
    validators.roleIdsArrayValidator,
    validators.bodyDiscordId("roleIds.*"),
    validators.messageValidator,
    controller.downgrade
  );

  router.get(
    "/invite/:guildId",
    validators.paramDiscordId("guildId"),
    controller.getInvite
  );

  router.get(
    "/isMember/:guildId/:userId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("userId"),
    controller.isMember
  );

  router.delete(
    "/kick/:guildId/:userId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("userId"),
    controller.removeUser
  );

  router.post(
    "/role",
    validators.bodyDiscordId("serverId"),
    body("roleName").trim().isLength({ min: 1 }),
    controller.createRole
  );

  router.get(
    "/isIn/:guildId",
    validators.paramDiscordId("guildId"),
    controller.isIn
  );

  return router;
};

export default createRouter;
