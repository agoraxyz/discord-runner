import { Router } from "express";
import controller from "./controller";
import validators from "./validators";

export default () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    validators.guildIdValidator,
    validators.userIdValidator,
    validators.roleIdsValidator,
    validators.messageValidator,
    controller.upgrade
  );

  router.post(
    "/downgrade",
    validators.guildIdValidator,
    validators.userIdValidator,
    validators.roleIdsValidator,
    validators.messageValidator,
    controller.downgrade
  );

  return router;
};