import { ArgsOf, GuardFunction } from "@typeit/discord";

const IsAPrivateMessage: GuardFunction<ArgsOf<"message">> = async (
  [message],
  _,
  next
) => {
  if (message.channel.type === "DM") {
    await next();
  }
};

export default IsAPrivateMessage;
