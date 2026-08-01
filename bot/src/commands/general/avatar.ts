import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "avatar",
  description: "عرض صورة عضو بحجم كبير",
  category: "عام",
  guildOnly: true,
  options: [{ name: "user", description: "العضو المستهدف", type: "user", required: false }],
  async run(ctx) {
    const target = (await ctx.getMember("user")) ?? ctx.member;
    const avatarUrl = target.displayAvatarURL({ size: 4096 });

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`🖼️ صورة ${target.user.tag}`)
      .setImage(avatarUrl)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
