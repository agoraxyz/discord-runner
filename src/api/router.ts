import { Router } from "express";
import controller from "./controller";
import validators from "./validators";

const createRouter = () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("platformUserId"),
    validators.bodyDiscordId("roleId"),
    validators.messageValidator,
    controller.upgrade
  );

  router.post(
    "/downgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("platformUserId"),
    validators.bodyDiscordId("roleId"),
    validators.messageValidator,
    controller.downgrade
  );

  router.post(
    "/manageMigratedActions",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.messageValidator,
    controller.manageMigratedActions
  );

  router.get(
    "/invite/:guildId/:inviteChannelId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("inviteChannelId"),
    controller.getInvite
  );

  router.post(
    "/isMember",
    validators.bodyDiscordId("serverId"),
    validators.bodyDiscordId("platformUserId"),
    controller.isMember
  );

  router.delete(
    "/kick/:guildId/:platformUserId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("platformUserId"),
    controller.removeUser
  );

  router.get(
    "/:guildId",
    validators.paramDiscordId("guildId"),
    controller.getGuildNameByGuildId
  );

  router.get(
    "/role/:guildId/:roleId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("roleId"),
    controller.getRoleNameByRoleId
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

  router.post(
    "/role/delete",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    controller.deleteRole
  );

  router.get(
    "/isIn/:guildId",
    validators.paramDiscordId("guildId"),
    controller.isIn
  );

  router.get(
    "/channels/:inviteCode",
    validators.inviteCodeValidator,
    controller.channels
  );

  router.post(
    "/channels/sendJoin",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("channelId"),
    controller.sendJoinButtonToChannel
  );

  router.post(
    "/channels/create",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.channelNameValidator,
    controller.createChannel
  );

  router.post(
    "/channels/delete",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.bodyDiscordId("channelId"),
    controller.deleteChannelAndRole
  );

  router.get(
    "/administeredServers/:platformUserId",
    validators.paramDiscordId("platformUserId"),
    controller.administeredServers
  );

  router.get(
    "/categories/:inviteCode",
    validators.inviteCodeValidator,
    controller.getCategories
  );

  router.post(
    "/owner/",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("platformUserId"),
    controller.getServerOwner
  );

  router.get(
    "/user/:platformUserId",
    validators.paramDiscordId("platformUserId"),
    controller.getUser
  );

  return router;
};

export default createRouter;
