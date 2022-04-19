import {
  Guild,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageOptions,
  User,
} from "discord.js";
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
  const statusInfo = await statusUpdate(user.id);
  if (statusInfo) {
    const embed = new MessageEmbed({
      author: {
        name: `${user.username}'s guilds and roles`,
        iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      },
      color: `#${config.embedColor}`,
      thumbnail: {
        url: "https://cdn.discordapp.com/attachments/950682012866465833/951448318976884826/dc-message.png",
      },
      footer: {
        text: "Do not share your private keys. We will never ask for your seed phrase.",
      },
    });

    await Promise.all(
      statusInfo.guilds.map(async (li) => {
        try {
          const guild = await Main.Client.guilds.fetch(li.serverId);
          const member = await guild.members.fetch(user.id);
          logger.verbose(`${JSON.stringify(member)}`);
          const roleManager = await guild.roles.fetch();
          const roleToAdd = roleManager.find((role) =>
            li.roles.map((r) => r.id).includes(role.id)
          );

          if (roleToAdd) {
            await member.roles.add(roleToAdd);
          }
        } catch (error) {
          logger.verbose(
            `Cannot add role to member. Missing permissions. serverId: ${li.serverId}`
          );
        }
      })
    );

    statusInfo.guilds.forEach((li) => {
      embed.addField(
        li.name,
        `${li.roles.map((r) => `✅ ${r.name}`).join("\n")}\n[View guild page](${
          config.guildUrl
        }/${li.url})`
      );
    });

    embed.addField(
      "Connected addresses:",
      statusInfo.addresses.map((a) => `\`${a}\``).join("\n")
    );

    const button = new MessageButton({
      label: "Explore other guilds",
      style: "LINK",
      url: `${config.guildUrl}`,
    });

    const row = new MessageActionRow({ components: [button] });

    return { embed, row };
  }

  return {
    embed: new MessageEmbed({
      title: "It seems you haven't joined any guilds yet.",
      color: `#${config.embedColor}`,
      description:
        "You can find more information on [agora.xyz](https://agora.xyz) or on [guild.xyz](https://guild.xyz).",
    }),
    row: undefined,
  };
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
