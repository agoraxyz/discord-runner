/* eslint-disable class-methods-use-this */
import { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import { getUserPoap } from "../api/actions";
import { join } from "../commands";
import logger from "../utils/logger";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    try {
      await interaction.reply({
        content: "I'll update your accesses as soon as possible.",
        ephemeral: true,
      });
    } catch (error) {
      logger.verbose(`join-button interaction reply ${error.message}`);
    }

    const message = await join(
      interaction?.user.id,
      interaction?.guild,
      interaction?.token
    );

    try {
      await interaction.editReply(message);
    } catch (error) {
      logger.verbose(`join-button interaction EDITREPLY ${error.message}`);
    }
  }

  @ButtonComponent("poap-claim-button")
  async claimButton(interaction: ButtonInteraction) {
    try {
      await interaction.reply({
        content: "I'll send the link for your POAP right now.",
        ephemeral: true,
      });
    } catch (error) {
      logger.verbose(`poap-claim-button interaction reply ${error.message}`);
    }

    const message = await getUserPoap(
      interaction?.user?.id,
      interaction?.guild?.id
    );

    try {
      await interaction.editReply(message);
    } catch (error) {
      logger.verbose(`join-button interaction EDITREPLY ${error.message}`);
    }
  }
}

export default Buttons;
