import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageUpdate",
  async execute(
    client,
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await sendLog(
      client,
      newMessage.guild.id,
      "messageEdit",
      new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("✏️ تم تعديل رسالة")
        .setDescription(`**الكاتب:** ${newMessage.author}\n**الروم:** ${newMessage.channel}`)
        .addFields(
          { name: "قبل", value: (oldMessage.content || "—").slice(0, 1024) },
          { name: "بعد", value: (newMessage.content || "—").slice(0, 1024) }
        )
    );
  }
};

export default event;
