import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { getErrorResult, getUserHash } from "../utils/utils";
import {
  createChannel,
  createRole,
  deleteChannelAndRole,
  generateInvite,
  getCategories,
  isIn,
  isMember,
  listAdministeredServers,
  listChannels,
  manageRoles,
  removeUser,
  updateRoleName,
} from "./actions";
import {
  CreateChannelParams,
  DeleteChannelAndRoleParams,
  ManageRolesParams,
} from "./types";

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

    const { guildId, inviteChannelId } = req.params;

    generateInvite(guildId, inviteChannelId)
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

    const { serverId, userHash } = req.body;
    isMember(serverId, userHash)
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

    const { guildId, userHash } = req.params;
    removeUser(guildId, userHash)
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

  administeredServers: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { userHash } = req.params;
    listAdministeredServers(userHash)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  hashUserId: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { userId } = req.params;
      const userHash = await getUserHash(userId);
      res.status(200).json(userHash);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  createChannel: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const params: CreateChannelParams = req.body;
      const createdChannel = await createChannel(params);
      res.status(200).json(createdChannel.id);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  deleteChannelAndRole: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const params: DeleteChannelAndRoleParams = req.body;
      const deleted = await deleteChannelAndRole(params);
      res.status(200).json(deleted);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getCategories: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { inviteCode } = req.params;
      const categories = await getCategories(inviteCode);

      res.status(200).json(categories);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getGuildNameByGuildId: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId } = req.params;
      const guild = await getGuild(guildId);

      res.status(200).json(guild.name);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },


  getRoleNameByRoleId: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { roleId } = req.params;
      const role = await getRole(roleId);

      res.status(200).json(role.name);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },
};

export default controller;
