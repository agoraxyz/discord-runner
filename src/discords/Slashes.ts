/* eslint-disable class-methods-use-this */
import { CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Pagination } from "@discordx/utilities";
import { guilds, join, ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";
import { createPoll, endPoll } from "../api/polls";
import pollStorage from "../api/pollStorage";

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

          interaction.user
            .send(
              "Give me the subject of the poll. For example:\n" +
                '"Do you think drinking milk is cool?"'
            )
            .then(() =>
              interaction.reply({
                content: "Check your DM's",
                ephemeral: true,
              })
            );
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
