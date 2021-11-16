/* eslint-disable class-methods-use-this */
import { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import config from "../config";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    await interaction.reply({
      content: `${config.guildUrl}/connect/${interaction.user.id}`,
      ephemeral: true,
    });
  }
}

export default Buttons;
