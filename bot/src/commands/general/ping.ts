import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "ping",
  description: "عرض زمن استجابة البوت",
  category: "عام",
  async run(ctx) {
    const sent = await ctx.reply({ content: "🏓 جاري القياس..." });
    const latency = sent
      ? sent.createdTimestamp - (ctx.interaction?.createdTimestamp ?? ctx.message!.createdTimestamp)
      : 0;

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "زمن استجابة البوت", value: `${latency}ms`, inline: true },
        { name: "زمن استجابة الويب سوكيت", value: `${ctx.client.ws.ping}ms`, inline: true }
      );

    if (ctx.isSlash) {
      await ctx.interaction!.editReply({ content: "", embeds: [embed] });
    } else {
      await sent?.edit({ content: "", embeds: [embed] });
    }
  }
};

export default command;
