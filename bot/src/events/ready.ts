import { ActivityType } from "discord.js";
import { BotEvent } from "../types/event";

const event: BotEvent = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ تم تسجيل الدخول باسم ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: "إدارة السيرفر | /help", type: ActivityType.Watching }],
      status: "online"
    });
  }
};

export default event;
