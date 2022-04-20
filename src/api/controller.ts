import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { getErrorResult } from "../utils/utils";
import {
  createChannel,
  createRole,
  deleteChannelAndRole,
  generateInvite,
  getGuild,
  getRole,
  isIn,
  isMember,
  listAdministeredServers,
  listChannels,
  manageRoles,
  removeUser,
  updateRoleName,
  sendJoinButton,
  deleteRole,
  getUser,
  manageMigratedActions,
  setupGuildGuard,
  sendPollMessage,
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

    const { serverId, platformUserId } = req.body;
    isMember(serverId, platformUserId)
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

    const { guildId, platformUserId } = req.params;
    removeUser(guildId, platformUserId)
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

    const { serverId, roleName, isGuarded, entryChannelId } = req.body;
    createRole(serverId, roleName, isGuarded, entryChannelId)
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

    const { serverId, roleId, roleName, isGuarded, entryChannelId } = req.body;
    updateRoleName(serverId, roleId, roleName, isGuarded, entryChannelId)
      .then(() => res.status(200).send())
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  deleteRole: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId, roleId } = req.body;
      const deleted = await deleteRole(guildId, roleId);
      res.status(200).json(deleted);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  createGuildGuard: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { serverId, entryChannelId, roleIds } = req.body;
      const createdEntryChannelId = await setupGuildGuard(
        serverId,
        entryChannelId,
        roleIds
      );
      res.status(200).json(createdEntryChannelId);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
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

    const { platformUserId } = req.params;
    listAdministeredServers(platformUserId)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
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

  getGuildNameByGuildId: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId } = req.params;
      const guildName = await getGuild(guildId);

      res.status(200).json(guildName);
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
      const { guildId, roleId } = req.params;
      const result = await getRole(guildId, roleId);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  sendJoinButtonToChannel: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId, channelId } = req.body;
      const result = await sendJoinButton(guildId, channelId);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { platformUserId } = req.params;
      const result = await getUser(platformUserId);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  manageMigratedActions: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId, platformUserIds, roleId, message } = req.body;
      const result = await manageMigratedActions(
        guildId,
        platformUserIds,
        roleId,
        message
      );
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  createPoll: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const msgId = await sendPollMessage(req.body.channelId, req.body);

      res.status(200).json(msgId);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },
};

export default controller;
