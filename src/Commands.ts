/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
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

  @Command("status")
  @Guard(NotABot)
  status(command: CommandMessage): void {
    logger.verbose(
      `status command was used by ${command.author.username}#${command.author.discriminator}`
    );
    command.channel.send(
      "I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)"
    );
    statusUpdate(command.author.id).then(async (levelInfo) => {
      logger.verbose(`levelInfo: ${JSON.stringify(levelInfo)}`);
      const userHash = await getUserHash(command.author.id);
      if (levelInfo) {
        const embed = new MessageEmbed({
          author: {
            name: `${command.author.username}'s (UserID: ${userHash})communities and levels`,
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
    });
  }
}

export default Commands;
