/* eslint-disable class-methods-use-this */
import {
  MessageActionRow,
  MessageSelectMenu,
  SelectMenuInteraction,
} from "discord.js";
import { Discord, SelectMenuComponent } from "discordx";
import pollStorage from "../api/pollStorage";

@Discord()
abstract class Menus {
  @SelectMenuComponent("role-menu")
  async roleMenu(interaction: SelectMenuInteraction) {
    await interaction.deferReply();

    const { user, values } = interaction;

    const value = values?.[0];

    if (!value) {
      await interaction.followUp({
        content: "❌ Invalid selection, please select again!",
        ephemeral: true,
      });
    }

    const requirements = pollStorage.getPoll(user.id).requirements[value];

    const row = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId("requirement-menu")
        .setPlaceholder("No requirement selected")
        .addOptions(requirements)
    );

    await interaction.followUp({
      content: `Now please choose a requirement.`,
      components: [row],
    });
  }

  @SelectMenuComponent("requirement-menu")
  async equipMenu(interaction: SelectMenuInteraction) {
    await interaction.deferReply();

    const { user, values } = interaction;

    const value = values?.[0];

    if (!value) {
      await interaction.followUp({
        content: "❌ Invalid selection, please select again!",
        ephemeral: true,
      });
    }

    pollStorage.saveReqId(user.id, Number(value));
    pollStorage.setUserStep(user.id, 1);

    await interaction.followUp(
      "Please give me the subject of the poll. For example:\n" +
        '"Do you think drinking milk is cool?"'
    );
  }
}

export default Menus;
