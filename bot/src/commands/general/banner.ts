import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "banner",
  description: "عرض بانر عضو",
  category: "عام",
  guildOnly: true,
  options: [{ name: "user", description: "العضو المستهدف", type: "user", required: false }],
  async run(ctx) {
    const targetUser = (await ctx.getUser("user")) ?? ctx.user;
    const fullUser = await ctx.client.users.fetch(targetUser.id, { force: true }).catch(() => null);

    if (!fullUser || !fullUser.banner) {
      await ctx.reply({ content: "❌ لا يوجد بانر لهذا العضو." });
      return;
    }

    const bannerUrl = fullUser.bannerURL({ size: 4096 }) ?? null;

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`🖼️ بانر ${fullUser.tag}`)
      .setImage(bannerUrl)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
