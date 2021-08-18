import { Router } from "express";
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
    "/invite/:guildId/:inviteChannelId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("inviteChannelId"),
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
    validators.roleNameValidator,
    controller.createRole
  );

  router.patch(
    "/role",
    validators.bodyDiscordId("serverId"),
    validators.bodyDiscordId("roleId"),
    validators.roleNameValidator,
    controller.updateRole
  );

  router.get(
    "/isIn/:guildId",
    validators.paramDiscordId("guildId"),
    controller.isIn
  );

  router.get(
    "/channels/:guildId",
    validators.paramDiscordId("guildId"),
    controller.channels
  );

  router.get(
    "/administeredServers/:userId",
    validators.paramDiscordId("userId"),
    controller.administeredServers
  );

  return router;
};

export default createRouter;
