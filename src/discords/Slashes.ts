/* eslint-disable class-methods-use-this */
import { CommandInteraction, GuildMember, Permissions } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { join, ping, status } from "../commands";
import logger from "../utils/logger";
import { createJoinInteractionPayload } from "../utils/utils";
import { getGuildsOfServer } from "../service";

@Discord()
abstract class Slashes {
  @Slash("ping", {
    description: "Get the latency of the bot and the Discord API.",
  })
  ping(interaction: CommandInteraction): void {
    logger.verbose(
      `/ping command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );
    interaction
      .reply({ content: ping(interaction.createdTimestamp), ephemeral: true })
      .catch(logger.error);
  }

  @Slash("status", {
    description: "Update all of your guild accesses in every server.",
  })
  async status(interaction: CommandInteraction): Promise<void> {
    logger.verbose(
      `/status command was used by ${interaction.user.username}#${interaction.user.discriminator} userId: ${interaction.user.id}`
    );

    await interaction.reply({
      content: `I'll update your community accesses as soon as possible. (It could take up to 2 minutes.)`,
      ephemeral: true,
    });

    const embed = await status(interaction.user);
    await interaction.editReply({
      content: null,
      embeds: [embed],
    });
  }

  @Slash("join", { description: "Join the guild of this server." })
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

  @Slash("join-button", {
    description: "Generate a join button. (Only for server administrators!)",
  })
  async joinButton(
    @SlashOption("title", {
      required: false,
      description: "The title of the embed message.",
    })
    title: string,
    @SlashOption("message", {
      required: false,
      description: "The text that will be shown in the embed message.",
    })
    messageText: string,
    @SlashOption("buttontext", {
      required: false,
      description: "The text that will be shown on the button.",
    })
    buttonText: string,
    interaction: CommandInteraction
  ) {
    if (interaction.channel.type === "DM") {
      interaction.reply("Use this command in a server to spawn a join button!");
      return;
    }

    if (
      !(interaction.member as GuildMember).permissions.has(
        Permissions.FLAGS.ADMINISTRATOR
      )
    ) {
      interaction.reply({
        content: "❌ Only server admins can use this command.",
        ephemeral: true,
      });
      return;
    }

    const guild = await getGuildsOfServer(interaction.guild.id);
    if (!guild) {
      await interaction.reply({
        content: "❌ There are no guilds in this server.",
        ephemeral: true,
      });
      return;
    }

    const payload = createJoinInteractionPayload(
      guild[0],
      title,
      messageText,
      buttonText
    );

    const message = await interaction.channel.send(payload);
    await message.react("951109839847837717");
    await message.react("951109839952678942");

    await interaction.reply({
      content: "✅ Join button created successfully.",
      ephemeral: true,
    });
  }
}

export default Slashes;
