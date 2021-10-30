import { MessageEmbed, User } from "discord.js";
import config from "./config";
import Main from "./Main";
import { statusUpdate, userJoined } from "./service";
import logger from "./utils/logger";

const ping = (createdTimestamp: number) =>
  `Latency is ${Date.now() - createdTimestamp}ms. API Latency is ${Math.round(
    Main.Client.ws.ping
  )}ms`;

const status = async (user: User, userHash: string) => {
  const levelInfo = await statusUpdate(userHash);
  if (levelInfo) {
    await Promise.all(
      levelInfo.map(async (c) => {
        const guild = await Main.Client.guilds.fetch(c.discordServerId);
        const member = guild.members.cache.get(user.id);
        logger.verbose(`${JSON.stringify(member)}`);
        const roleManager = await guild.roles.fetch();
        const rolesToAdd = roleManager.filter((role) =>
          c.accessedRoles?.includes(role.id)
        );
        const rolesToRemove = roleManager.filter((role) =>
          c.notAccessedRoles?.includes(role.id)
        );

        if (rolesToAdd?.size !== c.accessedRoles.length) {
          const missingRoleIds = c.accessedRoles.filter(
            (roleId) => !rolesToAdd.map((role) => role.id).includes(roleId)
          );
          throw new Error(`missing role(s): ${missingRoleIds}`);
        }
        if (rolesToRemove?.size !== c.notAccessedRoles.length) {
          const missingRoleIds = c.notAccessedRoles.filter(
            (roleId) => !rolesToRemove.map((role) => role.id).includes(roleId)
          );
          throw new Error(`missing role(s): ${missingRoleIds}`);
        }

        if (rolesToAdd?.size) {
          await member.roles.add(rolesToAdd);
        }

        if (rolesToRemove?.size) {
          await member.roles.remove(rolesToRemove);
        }
      })
    );

    const embed = new MessageEmbed({
      author: {
        name: `${user.username}'s communities and levels`,
        iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      },
      color: `#${config.embedColor}`,
    });
    levelInfo.forEach((c) => {
      if (c.levels.length) {
        embed.addField(c.name, c.levels.join(", "));
      }
    });
    return embed;
  }

  return new MessageEmbed({
    title: "It seems you haven't joined any communities yet.",
    color: `#${config.embedColor}`,
    description:
      "You can find more information in our [gitbook](https://agoraspace.gitbook.io/agoraspace/try-our-tools) or on the [Agora](https://app.agora.space/) website.",
  });
};

const join = async (userId: string, guildId: string) => {
  const channelIds = await userJoined(userId, guildId);

  let message: string;
  if (channelIds && channelIds.length !== 0) {
    if (channelIds.length === 1) {
      message = `✅ You got access to this channel: <#${channelIds[0]}>`;
    } else {
      message = `✅ You got access to these channels:\n${channelIds
        .map((c: string) => `<#${c}>`)
        .join("\n")}`;
    }
  } else {
    message = "❌ You don't have access to any guilds in this server.";
  }

  return message;
};

export { ping, status, join };
