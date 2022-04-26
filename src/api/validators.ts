import { body, param } from "express-validator";

const getIdValidatorForParam = (fieldName: string) =>
  param(fieldName).isString().trim().isLength({ min: 1, max: 40 }).isNumeric();

const getIdValidatorForBody = (fieldName: string) =>
  body(fieldName).isString().trim().isLength({ min: 1, max: 40 }).isNumeric();

export default {
  paramDiscordId: getIdValidatorForParam,
  bodyDiscordId: getIdValidatorForBody,
  roleIdsArrayValidator: body("roleIds").optional().isArray({ min: 1 }),
  messageValidator: body("message").isString().trim().isLength({ min: 1 }),
  roleNameValidator: body("roleName").isString().trim().isLength({ min: 1 }),
  oldRoleNameValidator: body("oldRoleName")
    .isString()
    .trim()
    .isLength({ min: 1 }),
  channelNameValidator: body("channelName")
    .isString()
    .trim()
    .isLength({ min: 1 }),
  inviteCodeValidator: param("inviteCode")
    .isString()
    .trim()
    .isLength({ min: 1 }),
  categoryNameValidator: body("categoryName").isString().trim().optional(),
  isGuildValidator: body("isGuild").trim().isBoolean(),
  isGuardedValidator: body("isGuarded").optional().isBoolean(),
  entryChannelIdValidator: body("entryChannelId")
    .optional()
    .isLength({ min: 1 }),
  sendJoinMeta: [
    body("title").trim().optional().isLength({ min: 1 }),
    body("description").trim().optional().isLength({ min: 1 }),
    body("button").trim().optional().isLength({ min: 1 }),
  ],
  gatedChannelsValidator: body("gatedChannels.*")
    .optional()
    .isLength({ min: 1 }),
};
