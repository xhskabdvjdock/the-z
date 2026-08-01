import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Warning } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "warnings",
  description: "عرض تحذيرات عضو",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  guildOnly: true,
  options: [{ name: "user", description: "العضو المستهدف", type: "user", required: true }],
  async run(ctx) {
    const target = await ctx.getUser("user");

    if (!target) {
      await ctx.reply({ content: "❌ لم يتم العثور على هذا المستخدم." });
      return;
    }

    const warningsList = await Warning.find({ guildId: ctx.guild.id, userId: target.id }).sort({
      createdAt: -1
    });

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setAuthor({ name: `تحذيرات ${target.tag}`, iconURL: target.displayAvatarURL() })
      .setFooter({ text: `العدد الإجمالي: ${warningsList.length}` })
      .setTimestamp();

    if (warningsList.length === 0) {
      embed.setDescription("✅ لا توجد أي تحذيرات مسجّلة لهذا العضو.");
    } else {
      embed.setDescription(
        warningsList
          .map((w: any, i: number) => {
            const timestamp = Math.floor(new Date(w.createdAt).getTime() / 1000);
            return `**#${i + 1}** - ${w.reason}\nبواسطة: <@${w.moderatorId}> • <t:${timestamp}:R>`;
          })
          .join("\n\n")
      );
    }

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
