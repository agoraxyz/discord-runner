/* eslint-disable class-methods-use-this */
import { Discord, Slash, Option } from "@typeit/discord";
import { CommandInteraction, MessageEmbed } from "discord.js";
import config from "./config";
import Main from "./Main";
import { statusUpdate } from "./service";
import logger from "./utils/logger";
import { getUserDiscordId, getUserHash } from "./utils/utils";

@Discord()
abstract class Commands {
  @Slash("ping")
  ping(interaction: CommandInteraction): void {
    logger.verbose(
      `ping command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );
    interaction
      .reply(
        `Latency is ${
          Date.now() - interaction.createdTimestamp
        }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
      )
      .catch(logger.error);
  }

  @Slash("status")
  async status(
    @Option("userHash", { required: false, description: "Hash of a user." })
    userHashParam: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const userHash = userHashParam || (await getUserHash(interaction.user.id));
    const userId = await getUserDiscordId(userHash);
    logger.verbose(
      `status command was used by ${interaction.user.username}#${
        interaction.user.discriminator
      } -  targeted: ${!!userHashParam} userHash: ${userHash} userId: ${userId}`
    );
    interaction.channel
      .send(
        `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)\nYour user hash: \`${userHash}\``
      )
      .catch(logger.error);
    statusUpdate(userHash)
      .then(async (levelInfo) => {
        if (levelInfo) {
          await Promise.all(
            levelInfo.map(async (c) => {
              const guild = await Main.Client.guilds.fetch(c.discordServerId);
              const member = guild.members.cache.get(userId);
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
                  (roleId) =>
                    !rolesToAdd.map((role) => role.id).includes(roleId)
                );
                throw new Error(`missing role(s): ${missingRoleIds}`);
              }
              if (rolesToRemove?.size !== c.notAccessedRoles.length) {
                const missingRoleIds = c.notAccessedRoles.filter(
                  (roleId) =>
                    !rolesToRemove.map((role) => role.id).includes(roleId)
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
              name: `${interaction.user.username}'s communities and levels`,
              iconURL: `https://cdn.discordapp.com/avatars/${userId}/${interaction.user.avatar}.png`,
            },
            color: `#${config.embedColor}`,
          });
          levelInfo.forEach((c) => {
            if (c.levels.length) {
              embed.addField(c.name, c.levels.join(", "));
            }
          });
          interaction.channel.send({ embeds: [embed] }).catch(logger.error);
        } else {
          const embed = new MessageEmbed({
            title: "It seems you haven't joined any communities yet.",
            color: `#${config.embedColor}`,
            description:
              "You can find more information in our [gitbook](https://agoraspace.gitbook.io/agoraspace/try-our-tools) or on the [Agora](https://app.agora.space/) website.",
          });
          interaction.channel.send({ embeds: [embed] }).catch(logger.error);
        }
      })
      .catch(logger.error);
  }
}

export default Commands;
