/* eslint-disable class-methods-use-this */
import {
  CommandInteraction,
  GuildMember,
  MessageActionRow,
  MessageSelectMenu,
  Permissions,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import axios from "axios";
import { join, ping, status } from "../commands";
import logger from "../utils/logger";
import { createPoll, pollBuildResponse } from "../api/polls";
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
      content: `I'll update your Guild accesses as soon as possible. (It could take up to 2 minutes.)`,
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
    const tmp = interaction;

    if (!interaction.inGuild()) {
      tmp.reply(
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
    const tmp = interaction;

    if (!interaction.inGuild()) {
      tmp.reply("Use this command in a server to spawn a join button!");
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

  @Slash("poll", { description: "Creates a poll." })
  async poll(interaction: CommandInteraction) {
    try {
      if (interaction.inGuild() && !interaction.user.bot) {
        const userId = interaction.user.id;

        if (pollStorage.getPoll(userId)) {
          interaction.reply({
            content:
              "You already have an ongoing poll creation process.\n" +
              "You can cancel it using **/cancel**.",
            ephemeral: true,
          });

          return;
        }

        const { channel } = interaction;
        const dcGuildId = channel.guildId;

        const isAdminRes = await axios.get(
          `${config.backendUrl}/guild/isAdmin/${dcGuildId}/${userId}`
        );

        if (isAdminRes?.data) {
          const guildIdRes = await axios.get(
            `${config.backendUrl}/guild/platformId/${dcGuildId}`
          );

          const guildId = guildIdRes.data.id;

          const guildRes = await axios.get(
            `${config.backendUrl}/guild/${guildId}`
          );

          const guild = guildRes?.data;

          if (!guild) {
            interaction.reply({
              content: "Something went wrong. Please try again or contact us.",
              ephemeral: true,
            });

            return;
          }

          const tokens = guild.roles.flatMap((role) =>
            role.requirements
              .filter((requirement) => requirement.type === "ERC20")
              .map((req) => ({
                label: req.symbol,
                description: `${req.name} on ${req.chain}`,
                value: `${req.id}`,
              }))
          );

          if (tokens.length === 0) {
            interaction.reply({
              content:
                "Your guild has no role with appropriate requirements.\n" +
                "Weighted polls only support ERC20.",
              ephemeral: true,
            });

            return;
          }

          pollStorage.initPoll(userId, channel.id);
          pollStorage.saveRequirements(userId, tokens);

          const row = new MessageActionRow().addComponents(
            new MessageSelectMenu()
              .setCustomId("token-menu")
              .setPlaceholder("No token selected")
              .addOptions(tokens)
          );

          await interaction.user.send({
            content:
              "You are creating a token-weighted emoji-based poll in the " +
              `channel "${channel.name}" of the guild "${guild.name}".\n\n` +
              "You can use **/reset** or **/cancel** to restart or stop the process at any time.\n" +
              "Don't worry, I will guide you through the whole process.\n\n" +
              "First, please choose a token as the base of the weighted poll.",
            components: [row],
          });

          interaction.reply({
            content: "Check your DM's",
            ephemeral: true,
          });
        } else {
          interaction.reply({
            content: "Seems like you are not a guild admin.",
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
    } catch (err) {
      interaction.reply({
        content:
          "Failed to start poll creation process. Please try again or contact us.",
        ephemeral: true,
      });

      logger.error(err);
    }
  }

  @Slash("enough", { description: "Skips adding poll options." })
  async enough(interaction: CommandInteraction) {
    const userId = interaction.user.id;
    const poll = pollStorage.getPoll(userId);

    if (poll) {
      if (
        pollStorage.getUserStep(userId) === 3 &&
        poll.options.length === poll.reactions.length &&
        poll.options.length >= 2
      ) {
        pollStorage.setUserStep(userId, 4);

        interaction.reply(
          "Please give me the duration of the poll in the DD:HH:mm format (days:hours:minutes)"
        );
      } else {
        interaction.reply("You didn't finish the previous steps.");
      }
    } else {
      interaction.reply({
        content: "You don't have an active poll creation process.",
        ephemeral: interaction.inGuild(),
      });
    }
  }

  @Slash("done", { description: "Finalizes a poll." })
  async done(interaction: CommandInteraction) {
    try {
      if (await pollBuildResponse(interaction)) {
        return;
      }

      const userId = interaction.user.id;

      const poll = pollStorage.getPoll(userId);

      if (poll) {
        if (await createPoll(poll)) {
          interaction.reply({
            content: "The poll has been created.",
            ephemeral: interaction.inGuild(),
          });

          pollStorage.deleteMemory(userId);
        } else {
          interaction.reply({
            content: "There was an error while creating the poll.",
            ephemeral: interaction.inGuild(),
          });
        }
      } else {
        interaction.reply({
          content: "You don't have an active poll creation process.",
          ephemeral: interaction.inGuild(),
        });
      }
    } catch (err) {
      interaction.reply({
        content: "There was an error while creating the poll.",
        ephemeral: interaction.inGuild(),
      });

      logger.error(err);
    }
  }

  @Slash("reset", { description: "Restarts poll creation." })
  async reset(interaction: CommandInteraction) {
    try {
      const userId = interaction.user.id;

      if (pollStorage.getPoll(userId)) {
        const { channelId, requirements, roles } = pollStorage.getPoll(userId);

        pollStorage.deleteMemory(userId);
        pollStorage.initPoll(userId, channelId);
        pollStorage.saveRequirements(userId, requirements);

        await interaction.reply({
          content: "The current poll creation procedure has been restarted.",
          ephemeral: interaction.inGuild(),
        });

        const row = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId("role-menu")
            .setPlaceholder("No role selected")
            .addOptions(roles)
        );

        await interaction.user.send({
          content: "Please choose a role",
          components: [row],
        });
      } else {
        interaction.reply({
          content: "You don't have an active poll creation process.",
          ephemeral: interaction.inGuild(),
        });
      }
    } catch (err) {
      logger.error(err);
    }
  }

  @Slash("cancel", { description: "Cancels poll creation." })
  async cancel(interaction: CommandInteraction) {
    const userId = interaction.user.id;

    if (pollStorage.getPoll(userId)) {
      pollStorage.deleteMemory(userId);

      interaction.reply({
        content: "The current poll creation process has been cancelled.",
        ephemeral: interaction.inGuild(),
      });
    } else {
      interaction.reply({
        content: "You don't have an active poll creation process.",
        ephemeral: interaction.inGuild(),
      });
    }
  }
}

export default Slashes;
