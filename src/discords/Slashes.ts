/* eslint-disable class-methods-use-this */
import { CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Pagination } from "@discordx/utilities";
import { guilds, join, ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";

@Discord()
abstract class Slashes {
  @Slash("ping", {
    description: "Get the latency of the bot and the discord API.",
  })
  ping(interaction: CommandInteraction): void {
    logger.verbose(
      `/ping command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );
    interaction
      .reply({ content: ping(interaction.createdTimestamp), ephemeral: true })
      .catch(logger.error);
  }

  @Slash("status")
  async status(
    @SlashOption("userid", {
      required: false,
      description: "Id of a user.",
    })
    userIdParam: string,
    interaction: CommandInteraction
  ): Promise<void> {
    let userId: string;
    let user: User;
    if (userIdParam) {
      userId = userIdParam;
      user = await Main.Client.users.fetch(userId);
    } else {
      userId = interaction.user.id;
      user = interaction.user;
    }

    logger.verbose(
      `/status command was used by ${interaction.user.username}#${
        interaction.user.discriminator
      } -  targeted: ${!!userIdParam} userId: ${user.id}`
    );

    await interaction.reply({
      content: `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)\nUser id: \`${userId}\``,
      ephemeral: true,
    });

    const embed = await status(user);
    await interaction.editReply({
      content: `User id: \`${user.id}\``,
      embeds: [embed],
    });
  }

  @Slash("join")
  async join(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      interaction.reply(
        "❌ Use this command in a server to join all of its guilds you have access to!"
      );
      return;
    }

    logger.verbose(
      `/join command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );

    await interaction.reply({
      content: "I'll update your accesses as soon as possible.",
      ephemeral: true,
    });

    const messagePayload = await join(
      interaction.user.id,
      interaction.guild,
      interaction.token
    );

    await interaction.editReply(messagePayload);
  }

  @Slash("guilds")
  async guilds(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      interaction.reply(
        "❌ Use this command in a server to list all of its guilds!"
      );
      return;
    }

    const pages = await guilds(interaction.guild.id);
    if (!pages) {
      interaction.reply({
        content: "❌ The backend couldn't handle the request.",
        ephemeral: true,
      });
      return;
    }

    if (pages.length === 0) {
      interaction.reply({
        content: "❌ There are no guilds associated with this server.",
        ephemeral: true,
      });
    } else if (pages.length === 1) {
      interaction.reply({ embeds: [pages[0]], ephemeral: true });
    } else {
      new Pagination(
        interaction,
        pages,
        pages.length <= 10
          ? { type: "BUTTON" }
          : {
              type: "SELECT_MENU",
              pageText: pages.map((p) => `${p.title} ({page}/${pages.length})`),
            }
      ).send();
    }
  }
}

export default Slashes;
