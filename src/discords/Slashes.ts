/* eslint-disable class-methods-use-this */
import { CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Pagination } from "@discordx/utilities";
import { guilds, join, ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";
import {
  createJoinButton,
  getUserDiscordId,
  getUserHash,
} from "../utils/utils";
import { guildStatusUpdate } from "../service";

@Discord()
abstract class Slashes {
  @Slash("ping", {
    description: "Get the latency of the bot and the discord API.",
  })
  ping(interaction: CommandInteraction): void {
    logger.verbose(
      `/ping command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );
    interaction.reply(ping(interaction.createdTimestamp)).catch(logger.error);
  }

  @Slash("status")
  async status(
    @SlashOption("userhash", {
      required: false,
      description: "Hash of a user.",
    })
    userHashParam: string,
    interaction: CommandInteraction
  ): Promise<void> {
    let userHash: string;
    let user: User;
    if (userHashParam) {
      userHash = userHashParam;
      const userId = await getUserDiscordId(userHash);
      user = await Main.Client.users.fetch(userId);
    } else {
      userHash = await getUserHash(interaction.user.id);
      user = interaction.user;
    }

    logger.verbose(
      `/status command was used by ${interaction.user.username}#${
        interaction.user.discriminator
      } -  targeted: ${!!userHashParam} userHash: ${userHash} userId: ${
        user.id
      }`
    );

    interaction
      .reply(
        `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)\nUser hash: \`${userHash}\``
      )
      .catch(logger.error);

    const embed = await status(user, userHash);
    interaction.channel.send({ embeds: [embed] }).catch(logger.error);
  }

  @Slash("guild-status")
  async guildStatus(
    @SlashOption("guildid", {
      required: false,
      description: "Id of a guild",
    })
    guildId: number,
    interaction: CommandInteraction
  ): Promise<void> {
    logger.verbose(
      `guildStatus command was used by ${interaction.user.username}#${interaction.user.discriminator} guildId: ${guildId}`
    );
    interaction
      .reply(
        `I'll update the whole Guild accesses as soon as possible. (\nGuildID: \`${guildId}\``
      )
      .catch(logger.error);
    guildStatusUpdate(+guildId)
      .then()
      .catch(logger.error);
  }

  @Slash("join")
  async join(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      interaction.reply(
        "Use this command in a server to join all of its guilds you have access to!"
      );
      return;
    }

    logger.verbose(
      `/join command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );

    const message = await join(interaction.user.id, interaction.guild.id);

    interaction.reply({ content: message, ephemeral: true });
  }

  @Slash("guilds")
  async guilds(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      interaction.reply(
        "Use this command in a server to list all of its guilds!"
      );
      return;
    }

    const pages = await guilds(interaction.guild.id);
    if (!pages) {
      interaction.reply("❌ The backend couldn't handle the request.");
      return;
    }

    if (pages.length === 0) {
      interaction.reply("❌ There are no guilds associated with this server.");
    } else if (pages.length === 1) {
      interaction.reply({ embeds: [pages[0]] });
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

  @Slash("join-button")
  async joinButton(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      interaction.reply("Use this command in a server to spawn a join button!");
      return;
    }
    const row = createJoinButton();

    await interaction.channel.send({
      content: "Click the button to join guilds!",
      components: [row],
    });

    await interaction.reply({
      content: "Join button created successfully.",
      ephemeral: true,
    });
  }
}

export default Slashes;
