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
        text: "We NEVER ask you for your seedphrase. NEVER share your private keys.",
      },
    });

    await Promise.all(
      statusInfo.guilds.map(async (li) => {
        try {
          const guild = await Main.Client.guilds.fetch(li.serverId);
          const member = await guild.members.fetch(user.id);
          const roleManager = await guild.roles.fetch();

          const roleToAdd = roleManager.find((role) =>
            li.accessedRoles.map((r) => r.id).includes(role.id)
          );

          if (roleToAdd) {
            await member.roles.add(roleToAdd);
          }

          const roleToRemove = roleManager.find((role) =>
            li.notAccessedRoles.map((r) => r.id).includes(role.id)
          );

          if (roleToRemove) {
            await member.roles.remove(roleToRemove);
          }
        } catch (error) {
          logger.verbose(
            `Cannot add role to member. Missing permissions. serverId: ${li.serverId}`
          );
        }
      })
    );

    embed.addField(
      // "🟣 **M E M B E R S H I P S :** 🟣",
      `<:guild:${config.joinButtonEmojis.emoji2}> **M E M B E R S H I P S :** <:guild:${config.joinButtonEmojis.emoji2}>`,
      statusInfo.guilds.map((g) => `✅ **${g.name}**`).join("\n")
    );

    embed.addField(
      // "🟣 **R O L E S :** 🟣",
      `<:guild:${config.joinButtonEmojis.emoji2}> **R O L E S :** <:guild:${config.joinButtonEmojis.emoji2}>`,
      statusInfo.guilds
        .map((g) => {
          let text = `**${g.name}**\n`;
          text += g.accessedRoles.map((ar) => `✅ ${ar.name}`).join("\n");
          if (g.accessedRoles.length && g.notAccessedRoles.length) {
            text += "\n";
          }
          text += g.notAccessedRoles.map((ar) => `❌ ${ar.name}`).join("\n");
          text += `\n[View guild page](${config.guildUrl}/${g.url})`;
          return text;
        })
        .join("\n")
    );

    embed.addField(
      `Connected address${statusInfo.addresses.length > 1 ? "es" : ""}:`,
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
