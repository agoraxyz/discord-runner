import { body, param } from "express-validator";

const getIdValidatorForParam = (fieldName: string) =>
  param(fieldName).isString().trim().isLength({ min: 18, max: 18 }).isNumeric();

const getIdValidatorForBody = (fieldName: string) =>
  body(fieldName).isString().trim().isLength({ min: 18, max: 18 }).isNumeric();

const getHashValidatorForParam = (fieldName: string) =>
  param(fieldName).isString().trim().isLength({ min: 44, max: 64 });

const getHashValidatorForBody = (fieldName: string) =>
  body(fieldName).isString().trim().isLength({ min: 44, max: 64 });

export default {
  paramDiscordId: getIdValidatorForParam,
  bodyDiscordId: getIdValidatorForBody,
  paramUserHash: getHashValidatorForParam,
  bodyUserHash: getHashValidatorForBody,
  roleIdsArrayValidator: body("roleIds").isArray({ min: 1 }),
  messageValidator: body("message").isString().trim().isLength({ min: 1 }),
  roleNameValidator: body("roleName").trim().isLength({ min: 1 }),
  channelNameValidator: body("channelName").trim().isLength({ min: 1 }),
  categoryNameValidator: body("categoryName").trim().optional(),
};
