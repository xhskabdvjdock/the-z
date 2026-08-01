import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const OPTION_EMOJIS = ["🇦", "🇧", "🇨", "🇩"];

const command: BotCommand = {
  name: "poll",
  description: "إنشاء استبيان تصويت",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "question", description: "سؤال الاستبيان", type: "string", required: true },
    { name: "option1", description: "الخيار الأول", type: "string", required: true },
    { name: "option2", description: "الخيار الثاني", type: "string", required: true },
    { name: "option3", description: "الخيار الثالث", type: "string", required: false },
    { name: "option4", description: "الخيار الرابع", type: "string", required: false }
  ],
  async run(ctx) {
    const question = ctx.getString("question");
    if (!question) {
      await ctx.reply({ content: "❌ يرجى كتابة سؤال الاستبيان." });
      return;
    }

    const options = [
      ctx.getString("option1"),
      ctx.getString("option2"),
      ctx.getString("option3"),
      ctx.getString("option4")
    ].filter((opt): opt is string => !!opt);

    if (options.length < 2) {
      await ctx.reply({ content: "❌ يجب إدخال خيارين على الأقل." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("📊 استبيان تصويت")
      .setDescription(question)
      .addFields(
        options.map((opt, i) => ({ name: OPTION_EMOJIS[i], value: opt, inline: false }))
      )
      .setFooter({ text: `بواسطة ${ctx.user.tag}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

    const sentMessage = ctx.isSlash ? await ctx.interaction!.fetchReply() : ctx.message;
    if (sentMessage) {
      for (let i = 0; i < options.length; i++) {
        await sentMessage.react(OPTION_EMOJIS[i]).catch(() => null);
      }
    }
  }
};

export default command;
