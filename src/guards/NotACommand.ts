import { ArgsOf, GuardFunction } from "discordx";
import SimpleCommands from "../discords/SimpleCommands";

const NotACommand: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _,
  next
) => {
  if (
    !SimpleCommands.commands.some((command) =>
      message.content.match(`!${command}( .*)?`)
    )
  ) {
    await next();
  }
};

export default NotACommand;
