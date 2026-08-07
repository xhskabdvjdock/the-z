import { ActivityType } from "discord.js";
import { BotEvent } from "../types/event";

const event: BotEvent = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`✅ تم تسجيل الدخول باسم ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: "beta version | /help", type: ActivityType.Watching }],
      status: "online"
    });
  }
};

export default event;
