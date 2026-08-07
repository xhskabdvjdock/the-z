import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "ping",
  description: "عرض زمن استجابة البوت",
  category: "عام",
  async run(ctx) {
    const latency = ctx.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "زمن استجابة الويب سوكيت", value: `${latency}ms`, inline: true }
      );

    if (ctx.isSlash) {
      await ctx.reply({ embeds: [embed] });
    } else {
      await ctx.reply({ embeds: [embed] });
    }
  }
};

export default command;
