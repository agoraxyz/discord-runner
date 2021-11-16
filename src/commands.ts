import { ColorResolvable, MessageEmbed, User } from "discord.js";
import config from "./config";
import Main from "./Main";
import { getGuildsOfServer, statusUpdate, userJoined } from "./service";
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
      "You can find more information on [agora.xyz](https://agora.xyz) or on [alpha.guild.xyz](https://alpha.guild.xyz).",
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
  } else if (channelIds) {
    message = "❌ You don't have access to any guilds in this server.";
  } else {
    message = `${config.guildUrl}/connect/${userId}`;
  }

  return message;
};

const guilds = async (serverId: string): Promise<MessageEmbed[]> => {
  const guildsResult = await getGuildsOfServer(serverId);
  if (!guildsResult) {
    return null;
  }

  const pages: MessageEmbed[] = guildsResult.map(
    (g, i) =>
      new MessageEmbed({
        title: g.name,
        url: `${config.guildUrl}/guild/${g.urlName}`,
        description: g.description,
        color: g.themeColor as ColorResolvable,
        footer: { text: `Page ${i + 1} of ${guildsResult.length}` },
        fields: [
          {
            name: "Requirements",
            value: g.requirements
              .map((r) => {
                let minmax;
                try {
                  minmax = JSON.parse(r?.value?.toString());
                } catch (_) {
                  minmax = null;
                }

                switch (r.type) {
                  case "ERC721":
                    if (r.key) {
                      return `Own a(n) ${
                        r.symbol === "-" &&
                        r.address?.toLowerCase() ===
                          "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"
                          ? "ENS"
                          : r.name
                      } ${
                        r.value && r.key
                          ? `with ${
                              Array.isArray(minmax) &&
                              minmax.length === 2 &&
                              minmax.every((x) => typeof x === "number")
                                ? `${minmax[0]}-${minmax[1]}`
                                : r.value
                            } ${r.key}`
                          : ""
                      }`;
                    }
                    return `Own a(n) [${
                      r.symbol === "-" &&
                      r.address?.toLowerCase() ===
                        "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"
                        ? "ENS"
                        : r.name
                    }](https://etherscan.io/token/${r.address})`;

                  case "POAP":
                    return `Own the ${r.value} POAP`;

                  case "ERC20":
                  case "ETHER":
                    return `Hold ${
                      +r.value > 0 ? `at least ${r.value}` : "any amount of"
                    } ${
                      r.type === "ETHER"
                        ? r.symbol
                        : `[${r.symbol}](https://etherscan.io/token/${r.address})`
                    }`;

                  case "SNAPSHOT":
                    return `[${
                      r.key.charAt(0).toUpperCase() + r.key.slice(1)
                    }](https://github.com/snapshot-labs/snapshot-strategies/tree/master/src/strategies/${
                      r.key
                    }) snapshot strategy`;

                  case "WHITELIST":
                    return "Be included in whitelist";

                  default:
                    return "-";
                }
              })
              .join(`\n${g.logic}\n`),
          },
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
