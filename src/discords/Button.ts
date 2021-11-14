/* eslint-disable class-methods-use-this */
import { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    await interaction.reply({
      content: `https://alpha.guild.xyz/connect/${interaction.user.id}`,
      ephemeral: true,
    });
  }
}

export default Buttons;
