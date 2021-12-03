/* eslint-disable class-methods-use-this */
import { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import { join } from "../commands";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    await interaction.reply({
      content: "I'll update your accesses as soon as possible.",
      ephemeral: true,
    });

    const message = await join(
      interaction.user.id,
      interaction.guild,
      interaction.token
    );

    await interaction.editReply(message);
  }
}

export default Buttons;
