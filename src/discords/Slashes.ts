/* eslint-disable class-methods-use-this */
import { CommandInteraction, User } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Pagination } from "@discordx/utilities";
import JSONdb from "simple-json-db";
import dayjs from "dayjs";
import { guilds, join, ping, status } from "../commands";
import Main from "../Main";
import logger from "../utils/logger";
import { NewPoll } from "../api/types";
import { createPoll, endPoll } from "../polls";

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
    const owner = await interaction.guild.fetchOwner();

    if (
      interaction.channel.type !== "DM" &&
      !interaction.user.bot &&
      interaction.user.id === owner.id
    ) {
      const db = new JSONdb("polls.json");
      db.set(interaction.user.id, {
        status: 0,
        optionIdx: 0,
        channelId: interaction.channelId,
        options: [],
        reactions: [],
        endDate: dayjs(),
      });
      db.sync();

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
    } else if (interaction.user.id !== owner.id) {
      interaction.reply({
        content: "Seems like you are not the guild owner.",
        ephemeral: true,
      });
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
      const db = new JSONdb("polls.json");
      const authorId = interaction.user.id;
      const poll = db.get(authorId) as NewPoll;

      if (
        poll.status === 1 &&
        poll.options.length === poll.reactions.length &&
        poll.options.length >= 2
      ) {
        poll.status += 1;

        interaction.reply(
          "Give me the end date of the poll in the DD:HH:mm format"
        );

        db.set(authorId, poll);
        db.sync();
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
    const db = new JSONdb("polls.json");
    const authorId = interaction.user.id;
    const poll = db.get(authorId) as NewPoll;

    if (poll && poll.status === 3) {
      await createPoll(poll);

      interaction.reply({
        content: "The poll has been created.",
        ephemeral: interaction.channel.type === "DM",
      });

      db.delete(authorId);
      db.sync();
    } else {
      interaction.reply({
        content: "Poll creation procedure is not finished, you must continue.",
        ephemeral: interaction.channel.type === "DM",
      });
    }
  }

  @Slash("reset", { description: "Restarts poll creation." })
  async reset(interaction: CommandInteraction) {
    const db = new JSONdb("polls.json");
    const authorId = interaction.user.id;

    if (db.delete(authorId)) {
      db.set(authorId, { status: 0 } as NewPoll);

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

    db.sync();
  }

  @Slash("cancel", { description: "Cancels poll creation." })
  async cancel(interaction: CommandInteraction) {
    const db = new JSONdb("polls.json");

    if (db.delete(interaction.user.id)) {
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

    db.sync();
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
