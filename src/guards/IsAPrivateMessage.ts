import { ArgsOf, GuardFunction } from "discordx";

const IsAPrivateMessage: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _,
  next
) => {
  if (message.channel.type === "DM") {
    await next();
  }
};

export default IsAPrivateMessage;
