import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { getErrorResult } from "../utils/utils";
import {
  createRole,
  generateInvite,
  isIn,
  isMember,
  listChannels,
  manageRoles,
  removeUser,
  updateRoleName,
} from "./actions";
import { ManageRolesParams } from "./types";

const controller = {
  upgrade: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: ManageRolesParams = req.body;
    manageRoles(params, true)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  downgrade: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: ManageRolesParams = req.body;
    manageRoles(params, false)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  getInvite: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId } = req.params;

    generateInvite(guildId)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  isMember: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId, userId } = req.params;
    isMember(guildId, userId)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  removeUser: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId, userId } = req.params;
    removeUser(guildId, userId)
      .then(() => res.status(200).send())
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  createRole: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { serverId, roleName } = req.body;
    createRole(serverId, roleName)
      .then((result) => res.status(201).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  updateRole: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { serverId, roleId, roleName } = req.body;
    updateRoleName(serverId, roleId, roleName)
      .then(() => res.status(200).send())
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  isIn: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId } = req.params;
    isIn(guildId)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  channels: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId } = req.params;
    listChannels(guildId)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },
};

export default controller;
