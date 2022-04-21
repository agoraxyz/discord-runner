import { ArgsOf, GuardFunction, SimpleCommandMessage } from "discordx";

const NotDM: GuardFunction<
  ArgsOf<"messageCreate"> | SimpleCommandMessage
> = async (message, _, next) => {
  if (
    message instanceof SimpleCommandMessage
      ? message?.message.channel.type !== "DM"
      : message[0].channel.type !== "DM"
  ) {
    await next();
  }
};

export default NotDM;
