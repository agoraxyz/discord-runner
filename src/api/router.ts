import { Router } from "express";
import controller from "./controller";
import validators from "./validators";

const createRouter = () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyUserHash("userHash"),
    validators.roleIdsArrayValidator,
    validators.bodyDiscordId("roleIds.*"),
    validators.messageValidator,
    controller.upgrade
  );

  router.post(
    "/downgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyUserHash("userHash"),
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
    "/isMember/:guildId/:userHash",
    validators.paramDiscordId("guildId"),
    validators.paramUserHash("userHash"),
    controller.isMember
  );

  router.delete(
    "/kick/:guildId/:userHash",
    validators.paramDiscordId("guildId"),
    validators.paramUserHash("userHash"),
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

  router.post(
    "/channels/create",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.channelNameValidator,
    validators.categoryNameValidator,
    controller.createChannel
  );

  router.get(
    "/administeredServers/:userHash",
    validators.paramUserHash("userHash"),
    controller.administeredServers
  );

  router.get(
<<<<<<< HEAD
    "/isGuildMember/:guildId/:roleId/:userId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("roleId"),
    validators.paramDiscordId("userId"),
    controller.isGuildMember
=======
    "/hashUserId/:userId",
    validators.paramDiscordId("userId"),
    controller.hashUserId
>>>>>>> main
  );

  return router;
};

export default createRouter;
