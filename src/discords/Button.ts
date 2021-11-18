/* eslint-disable class-methods-use-this */
import { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import config from "../config";
import { getGuildsOfServer } from "../service";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    const guilds = await getGuildsOfServer(interaction.guild.id);
    await interaction.reply({
      content: `${config.guildUrl}/guild/${guilds[0].urlName}/?discordId=${interaction.user.id}`,
      ephemeral: true,
    });
  }
}

export default Buttons;
