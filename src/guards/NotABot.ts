import { GuardFunction, ArgsOf, SimpleCommandMessage } from "discordx";

const NotABot: GuardFunction<ArgsOf<"messageCreate"> | SimpleCommandMessage> =
  async (message, _, next) => {
    if (
      message instanceof SimpleCommandMessage
        ? !message?.message.author.bot
        : !message[0].author.bot
    ) {
      await next();
    }
  };

export default NotABot;
