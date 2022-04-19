/* eslint-disable class-methods-use-this */
import { CommandInteraction, GuildMember, Permissions } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { join, ping, status } from "../commands";
import logger from "../utils/logger";
import { createPoll, endPoll } from "../api/polls";
import pollStorage from "../api/pollStorage";
import { createJoinInteractionPayload } from "../utils/utils";
import { getGuildsOfServer } from "../service";
import config from "../config";

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

    const { embed, row } = await status(interaction.user);
    await interaction.editReply({
      content: null,
      embeds: [embed],
      components: row ? [row] : undefined,
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

    await message.react(config.joinButtonEmojis.emoji1);
    await message.react(config.joinButtonEmojis.emoji2);

    await interaction.reply({
      content: "✅ Join button created successfully.",
      ephemeral: true,
    });
  }

  // Slash commands for voting

  @Slash("poll", { description: "Creates a poll." })
  async poll(interaction: CommandInteraction) {
    if (interaction.channel.type !== "DM" && !interaction.user.bot) {
      const owner = await interaction.guild.fetchOwner();
      const userId = interaction.user.id;

      if (userId === owner.id) {
        const userStep = pollStorage.getUserStep(userId);

        if (userStep) {
          interaction.reply({
            content:
              "You already have an ongoing poll creation process.\n" +
              "You can cancel it using **/cancel**.",
            ephemeral: true,
          });
        } else {
          pollStorage.initPoll(userId, interaction.channel.id);

          await interaction.user.send(
            "Give me the subject of the poll. For example:\n" +
              '"Do you think drinking milk is cool?"'
          );
          interaction.reply({
            content: "Check your DM's",
            ephemeral: true,
          });
        }
      } else {
        interaction.reply({
          content: "Seems like you are not the guild owner.",
          ephemeral: true,
        });
      }
    } else {
      interaction.reply({
        content:
          "You have to use this command in the channel " +
          "you want the poll to appear.",
      });
    }
  }

  @Slash("enough", { description: "Skips adding poll options." })
  async enough(interaction: CommandInteraction) {
    if (interaction.channel.type === "DM") {
      const userId = interaction.user.id;
      const poll = pollStorage.getPoll(userId);

      if (
        pollStorage.getUserStep(userId) === 2 &&
        poll.options.length === poll.reactions.length &&
        poll.options.length >= 2
      ) {
        pollStorage.setUserStep(userId, 3);

        interaction.reply(
          "Give me the end date of the poll in the DD:HH:mm format"
        );
      } else {
        interaction.reply("You didn't finish the previous steps.");
      }
    } else {
      interaction.reply({
        content: "You have to use this command in DM.",
        ephemeral: true,
      });
    }
  }

  @Slash("done", { description: "Finalizes a poll." })
  async done(interaction: CommandInteraction) {
    const userId = interaction.user.id;
    const poll = pollStorage.getPoll(userId);

    if (poll && pollStorage.getUserStep(userId) === 4) {
      if (await createPoll(poll)) {
        interaction.reply({
          content: "The poll has been created.",
          ephemeral: interaction.channel.type !== "DM",
        });

        pollStorage.deleteMemory(userId);
      } else {
        interaction.reply({
          content: "There was an error while creating the poll.",
          ephemeral: interaction.channel.type !== "DM",
        });
      }
    } else {
      interaction.reply({
        content: "Poll creation procedure is not finished, you must continue.",
        ephemeral: interaction.channel.type !== "DM",
      });
    }
  }

  @Slash("reset", { description: "Restarts poll creation." })
  async reset(interaction: CommandInteraction) {
    const userId = interaction.user.id;

    if (pollStorage.getUserStep(userId) > 0) {
      const poll = pollStorage.getPoll(userId);

      pollStorage.deleteMemory(userId);
      pollStorage.initPoll(userId, poll.channelId);
      pollStorage.setUserStep(userId, 1);

      interaction.reply({
        content: "The current poll creation procedure has been restarted.",
        ephemeral: interaction.channel.type !== "DM",
      });
    } else {
      interaction.reply({
        content: "You have no active poll creation procedure.",
        ephemeral: interaction.channel.type !== "DM",
      });
    }
  }

  @Slash("cancel", { description: "Cancels poll creation." })
  async cancel(interaction: CommandInteraction) {
    const userId = interaction.user.id;

    if (pollStorage.getUserStep(userId) > 0) {
      pollStorage.deleteMemory(userId);

      interaction.reply({
        content: "The current poll creation procedure has been cancelled.",
        ephemeral: interaction.channel.type !== "DM",
      });
    } else {
      interaction.reply({
        content: "You have no active poll creation procedure.",
        ephemeral: interaction.channel.type !== "DM",
      });
    }
  }

  @Slash("endpoll", { description: "Closes a poll." })
  async endPoll(
    @SlashOption("id", {
      description: "The ID of the poll you want to close.",
      type: "NUMBER",
      required: true,
    })
    id: number,
    interaction: CommandInteraction
  ) {
    endPoll(`${id}`, interaction);
  }
}

export default Slashes;
