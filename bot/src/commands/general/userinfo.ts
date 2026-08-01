import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "userinfo",
  description: "عرض معلومات عضو",
  category: "عام",
  guildOnly: true,
  options: [{ name: "user", description: "العضو المستهدف", type: "user", required: false }],
  async run(ctx) {
    const target = (await ctx.getMember("user")) ?? ctx.member;

    const roles = target.roles.cache
      .filter((r) => r.id !== ctx.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => `<@&${r.id}>`);

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`👤 معلومات ${target.user.tag}`)
      .setThumbnail(target.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: "اليوزر", value: target.user.tag, inline: true },
        { name: "آيدي المستخدم", value: target.id, inline: true },
        {
          name: "تاريخ إنشاء الحساب",
          value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:F>`,
          inline: false
        },
        {
          name: "تاريخ الانضمام للسيرفر",
          value: target.joinedTimestamp
            ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>`
            : "غير معروف",
          inline: false
        },
        {
          name: `الرتب (${roles.length})`,
          value: roles.length ? roles.join(" ") : "لا يوجد"
        }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
