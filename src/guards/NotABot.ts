import { GuardFunction, ArgsOf } from "discordx";

const NotABot: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _,
  next
) => {
  if (!message.author.bot) {
    await next();
  }
};

export default NotABot;
