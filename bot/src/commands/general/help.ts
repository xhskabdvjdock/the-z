import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "help",
  description: "عرض قائمة الأوامر المتاحة",
  category: "عام",
  async run(ctx) {
    const categories = new Map<string, string[]>();

    for (const cmd of ctx.client.commands.values()) {
      const list = categories.get(cmd.category) ?? [];
      list.push(`**/${cmd.name}** — ${cmd.description}`);
      categories.set(cmd.category, list);
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("📖 قائمة الأوامر")
      .setDescription(`إجمالي عدد الأوامر: ${ctx.client.commands.size}`)
      .setTimestamp();

    for (const [category, list] of categories) {
      embed.addFields({ name: `📂 ${category}`, value: list.join("\n") });
    }

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
