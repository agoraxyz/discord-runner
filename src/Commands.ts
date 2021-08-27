/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import { Collection, MessageEmbed, Role } from "discord.js";
import config from "./config";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { statusUpdate } from "./service";
import logger from "./utils/logger";
import { getUserHash } from "./utils/utils";

@Discord(config.prefix)
abstract class Commands {
  static commands = ["ping", "status"];

  @Command("ping")
  @Guard(NotABot)
  ping(command: CommandMessage): void {
    logger.verbose(
      `ping command was used by ${command.author.username}#${command.author.discriminator}`
    );
    command
      .reply(
        `Latency is ${
          Date.now() - command.createdTimestamp
        }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
      )
      .catch(logger.error);
  }

  @Command("status :userHash")
  @Guard(NotABot)
  async status(command: CommandMessage): Promise<void> {
    const userHash = command.args.userHash
      ? command.args.userHash
      : await getUserHash(command.author.id);
    logger.verbose(
      `status command was used by ${command.author.username}#${
        command.author.discriminator
      } -  targeted: ${!!command.args.userHash} userHash: ${userHash}`
    );
    command.channel.send(
      `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)\nYour user hash: \`${userHash}\``
    );
    statusUpdate(userHash)
      .then(async (levelInfo) => {
        logger.verbose(`levelInfo: ${JSON.stringify(levelInfo)}`);
        if (levelInfo) {
          await Promise.all(
            levelInfo.map(async (c) => {
              const guild = await Main.Client.guilds.fetch(c.discordServerId);
              const member = guild.member(command.author.id);
              const roleManager = await guild.roles.fetch();
              const rolesToAdd: Collection<string, Role> =
                roleManager.cache.filter((role) =>
                  c.accessedRoles.includes(role.id)
                );
              const rolesToRemove: Collection<string, Role> =
                roleManager.cache.filter((role) =>
                  c.notAccessedRoles.includes(role.id)
                );

              if (rolesToAdd.size !== c.accessedRoles.length) {
                const missingRoleIds = c.accessedRoles.filter(
                  (roleId) =>
                    !rolesToAdd.map((role) => role.id).includes(roleId)
                );
                throw new Error(`missing role(s): ${missingRoleIds}`);
              }
              if (rolesToRemove.size !== c.notAccessedRoles.length) {
                const missingRoleIds = c.notAccessedRoles.filter(
                  (roleId) =>
                    !rolesToRemove.map((role) => role.id).includes(roleId)
                );
                throw new Error(`missing role(s): ${missingRoleIds}`);
              }

              if (rolesToAdd.size) {
                await member.roles.add(rolesToAdd);
              }

              if (rolesToRemove.size) {
                await member.roles.remove(rolesToRemove);
              }
            })
          );

          const embed = new MessageEmbed({
            author: {
              name: `${command.author.username}'s communities and levels`,
              iconURL: `https://cdn.discordapp.com/avatars/${command.author.id}/${command.author.avatar}.png`,
            },
            color: config.embedColor,
          });
          levelInfo.forEach((c) => {
            if (c.levels.length) {
              embed.addField(c.name, c.levels.join(", "));
            }
          });
          command.channel.send(embed);
        } else {
          const embed = new MessageEmbed({
            title: "It seems you haven't joined any communities yet.",
            color: config.embedColor,
            description:
              "You can find more information in our [gitbook](https://agoraspace.gitbook.io/agoraspace/try-our-tools) or on the [Agora](https://app.agora.space/) website.",
          });
          command.channel.send(embed);
        }
      })
      .catch(logger.error);
  }
}

export default Commands;
