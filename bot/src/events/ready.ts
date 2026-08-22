import { ActivityType } from "discord.js";
import { BotEvent } from "../types/event";
import { logInfo } from "../utils/logger";

const event: BotEvent = {
  name: "ready",
  once: true,
  async execute(client) {
    logInfo("ready", "تم تسجيل الدخول باسم " + (client.user?.tag ?? "unknown"));
    client.user?.setPresence({
      activities: [{ name: "beta version | /help", type: ActivityType.Watching }],
      status: "online"
    });
  }
};

export default event;
