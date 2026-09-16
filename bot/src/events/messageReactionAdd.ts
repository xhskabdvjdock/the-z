import { MessageReaction, User } from "discord.js";
import { BotEvent } from "../types/event";
import { handleStarboardAdd } from "../modules/starboard/starboardManager";

const event: BotEvent = {
  name: "messageReactionAdd",
  async execute(client, reaction: MessageReaction, user: User) {
    await handleStarboardAdd(client, reaction, user);
  }
};

export default event;
