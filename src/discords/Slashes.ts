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
import { createPoll /* endPoll */ } from "../api/polls";
import pollStorage from "../api/pollStorage";
import { createJoinInteractionPayload } from "../utils/utils";
import { getGuildsOfServer } from "../service";
import config from "../config";
import { RequirementDict } from "../api/types";

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

    await message.react(config.joinButtonEmojis.emoji1);
    await message.react(config.joinButtonEmojis.emoji2);

    await interaction.reply({
      content: "✅ Join button created successfully.",
      ephemeral: true,
    });
  }

  @Slash("poll", { description: "Creates a poll." })
  async poll(interaction: CommandInteraction) {
    if (interaction.channel.type !== "DM" && !interaction.user.bot) {
      const userId = interaction.user.id;

      const userStep = pollStorage.getUserStep(userId);

      if (userStep) {
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

      const isAdmin = isAdminRes.data;

      if (isAdmin) {
        const guildIdRes = await axios.get(
          `${config.backendUrl}/guild/platformId/${dcGuildId}`
        );

        const guildId = guildIdRes.data.id;

        const guildRes = await axios.get(
          `${config.backendUrl}/guild/${guildId}`
        );

        if (!guildRes) {
          interaction.reply({
            content: "Something went wrong. Please try again or contact us.",
            ephemeral: true,
          });

          return;
        }

        const reqs = Object.fromEntries(
          guildRes.data.roles.map((role) => [
            role.id,
            role.requirements.filter(
              (requirement) => requirement.type === "ERC20"
            ),
          ])
        );

        const roles = guildRes.data.roles
          .filter((role) => reqs[role.id].length > 0)
          .map((role) => ({
            label: role.name,
            description: "",
            value: `${role.id}`,
          }));

        if (roles.length === 0) {
          interaction.reply({
            content:
              "Your guild has no role with appropriate requirements.\n" +
              "Weighted polls only support ERC20.",
            ephemeral: true,
          });
          return;
        }

        pollStorage.initPoll(userId, channel.id);

        const requirements = Object.fromEntries(
          Object.entries(reqs).map(([k, v]) => [
            k,
            v.map((req) => ({
              label: req.symbol,
              description: `${req.name} on ${req.chain}`,
              value: `${req.id}`,
            })),
          ])
        );

        pollStorage.saveRequirements(userId, requirements as RequirementDict);
        pollStorage.saveRoles(userId, roles);

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
          "Please give me the duration of the poll in the DD:HH:mm format (days:hours:minutes)"
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
      const { channelId, requirements, roles } = pollStorage.getPoll(userId);

      pollStorage.deleteMemory(userId);
      pollStorage.initPoll(userId, channelId);
      pollStorage.saveRequirements(userId, requirements);
      pollStorage.saveRoles(userId, roles);

      await interaction.reply({
        content: "The current poll creation procedure has been restarted.",
        ephemeral: interaction.channel.type !== "DM",
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

  /*
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
  */
}

export default Slashes;
