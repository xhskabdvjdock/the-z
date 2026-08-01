import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "suggest",
  description: "إرسال اقتراح",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "suggestion", description: "نص الاقتراح", type: "string", required: true }
  ],
  async run(ctx) {
    const suggestion = ctx.getString("suggestion");
    if (!suggestion) {
      await ctx.reply({ content: "❌ يرجى كتابة نص الاقتراح." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setAuthor({ name: `اقتراح من ${ctx.user.tag}`, iconURL: ctx.user.displayAvatarURL() })
      .setDescription(suggestion)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

    const sentMessage = ctx.isSlash ? await ctx.interaction!.fetchReply() : ctx.message;
    if (sentMessage) {
      await sentMessage.react("👍").catch(() => null);
      await sentMessage.react("👎").catch(() => null);
    }
  }
};

export default command;
