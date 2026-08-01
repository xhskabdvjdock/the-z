import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageDelete",
  async execute(client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    await sendLog(
      client,
      message.guild.id,
      "messageDelete",
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🗑️ تم حذف رسالة")
        .setDescription(
          `**الكاتب:** ${message.author ?? "غير معروف"}\n**الروم:** ${message.channel}\n\n**المحتوى:**\n${
            message.content || "لا يوجد محتوى نصي (قد تحتوي على صورة/ملف)"
          }`
        )
        .setFooter({ text: `آيدي الرسالة: ${message.id}` })
    );
  }
};

export default event;
