import { TextChannel } from "discord.js";
import Main from "../Main";
import { Reaction } from "./types";

const getReactions = async (
  channelId: string,
  messageId: string,
  include: string[]
): Promise<Reaction[]> => {
  const message = await (
    (await Main.Client.channels.fetch(channelId)) as TextChannel
  ).messages.fetch(messageId);

  const reactions = message.reactions.cache.filter((reaction) => {
    const { name, id } = reaction.emoji;
    return include.includes(
      /^[a-zA-Z]+$/.test(name) ? `<:${name}:${id}>` : name
    );
  });

  const userReactions = await Promise.all(
    reactions.map(
      async (reaction) =>
        ({
          name: reaction.emoji.name,
          users: (await reaction.users.fetch())
            .map((user) => user.id)
            .filter((id) => id !== Main.Client.user.id),
        } as Reaction)
    )
  );

  return userReactions;
};

export default getReactions;
