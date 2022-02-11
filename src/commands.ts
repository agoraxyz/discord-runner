import { ColorResolvable, Guild, MessageEmbed, User } from "discord.js";
import config from "./config";
import redisClient from "./database";
import Main from "./Main";
import { getGuildsOfServer, statusUpdate, userJoined } from "./service";
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
      "You can find more information on [agora.xyz](https://agora.xyz) or on [alpha.guild.xyz](https://alpha.guild.xyz).",
  });
};

const join = async (
  userId: string,
  guild: Guild,
  interactionToken: string
): Promise<string> => {
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

const guilds = async (serverId: string): Promise<MessageEmbed[]> => {
  const guildsResult = await getGuildsOfServer(serverId);
  if (!guildsResult) {
    return null;
  }

  const pages: MessageEmbed[] = guildsResult?.map(
    (g, i) =>
      new MessageEmbed({
        title: g.name,
        url: `${config.guildUrl}/${g.urlName}`,
        description: g.description,
        color: g.themeColor as ColorResolvable,
        footer: { text: `Page ${i + 1} of ${guildsResult.length}` },
        fields: [
          // {
          //   name: "Requirements",
          //   value: g.requirements
          //     ?.map((r) => {
          //       let minmax;
          //       try {
          //         minmax = JSON.parse(r?.value?.toString());
          //       } catch (_) {
          //         minmax = null;
          //       }

          //       switch (r.type) {
          //         case "ERC721":
          //           if (r.key) {
          //             return `Own a(n) ${
          //               r.symbol === "-" &&
          //               r.address?.toLowerCase() ===
          //                 "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"
          //                 ? "ENS"
          //                 : r.name
          //             } ${
          //               r.value && r.key
          //                 ? `with ${
          //                     Array.isArray(minmax) &&
          //                     minmax.length === 2 &&
          //                     minmax.every((x) => typeof x === "number")
          //                       ? `${minmax[0]}-${minmax[1]}`
          //                       : r.value
          //                   } ${r.key}`
          //                 : ""
          //             }`;
          //           }
          //           return `Own a(n) [${
          //             r.symbol === "-" &&
          //             r.address?.toLowerCase() ===
          //               "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"
          //               ? "ENS"
          //               : r.name
          //           }](https://etherscan.io/token/${r.address})`;

          //         case "POAP":
          //           return `Own the ${r.value} POAP`;

          //         case "ERC20":
          //         case "ETHER":
          //           return `Hold ${
          //             +r.value > 0 ? `at least ${r.value}` : "any amount of"
          //           } ${
          //             r.type === "ETHER"
          //               ? r.symbol
          //               : `[${r.symbol}](https://etherscan.io/token/${r.address})`
          //           }`;

          //         case "SNAPSHOT":
          //           return `[${
          //             r.key.charAt(0).toUpperCase() + r.key.slice(1)
          //           }](https://github.com/snapshot-labs/snapshot-strategies/tree/master/src/strategies/${
          //             r.key
          //           }) snapshot strategy`;

          //         case "WHITELIST":
          //           return "Be included in whitelist";

          //         default:
          //           return "-";
          //       }
          //     })
          //     .join(`\n${g.logic}\n`),
          // },
          {
            name: "Members",
            value: g.members?.length.toString() || "0",
            inline: true,
          },
          {
            name: "Groups",
            value: g.groups?.length.toString() || "0",
            inline: true,
          },
        ],
      })
  );

  return pages;
};

export { ping, status, join, guilds };
