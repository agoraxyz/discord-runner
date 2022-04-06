import { Guild, MessageEmbed, MessageOptions, User } from "discord.js";
import config from "./config";
import redisClient from "./database";
import Main from "./Main";
import { statusUpdate, userJoined } from "./service";
import logger from "./utils/logger";
import { getJoinReplyMessage } from "./utils/utils";

const ping = (createdTimestamp: number) =>
  `Latency is ${Date.now() - createdTimestamp}ms. API Latency is ${Math.round(
    Main.Client.ws.ping
  )}ms`;

const status = async (user: User) => {
  const levelInfo = await statusUpdate(user.id);
  if (levelInfo && levelInfo.length > 0) {
    await Promise.all(
      levelInfo?.map(async (c) => {
        try {
          const guild = await Main.Client.guilds.fetch(c.discordServerId);
          const member = await guild.members.fetch(user.id);
          logger.verbose(`${JSON.stringify(member)}`);
          const roleManager = await guild.roles.fetch();
          const roleToAdd = roleManager.find(
            (role) => c.accessedRoles === role.id
          );

          if (roleToAdd) {
            await member.roles.add(c.accessedRoles);
            logger.verbose(`${JSON.stringify(roleToAdd)}`);
          }
        } catch (error) {
          logger.verbose(
            `Cannot add role to member. Missing permissions. GuildID: ${c.discordServerId}`
          );
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
      embed.addField("Guild", c.name);
    });

    return embed;
  }

  return new MessageEmbed({
    title: "It seems you haven't joined any communities yet.",
    color: `#${config.embedColor}`,
    description:
      "You can find more information on [agora.xyz](https://agora.xyz) or on [guild.xyz](https://guild.xyz).",
  });
};

const join = async (
  userId: string,
  guild: Guild,
  interactionToken: string
): Promise<MessageOptions> => {
  const roleIds = await userJoined(userId, guild.id);

  const message = await getJoinReplyMessage(roleIds, guild, userId);

  if (!roleIds) {
    redisClient.client.set(
      `joining:${guild.id}:${userId}`,
      interactionToken,
      "EX",
      15 * 60
    );
  }

  return message;
};

export { ping, status, join };
