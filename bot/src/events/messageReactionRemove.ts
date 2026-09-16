import { MessageReaction, User } from "discord.js";
import { BotEvent } from "../types/event";
import { handleStarboardRemove } from "../modules/starboard/starboardManager";

const event: BotEvent = {
  name: "messageReactionRemove",
  async execute(client, reaction: MessageReaction, user: User) {
    await handleStarboardRemove(client, reaction, user);
  }
};

export default event;
