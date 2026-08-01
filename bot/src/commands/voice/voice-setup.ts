import { ChannelType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { GuildConfig } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { invalidateGuildConfigCache } from "../../utils/guildConfig";

const command: BotCommand = {
  name: "voice-setup",
  description: "إعداد نظام الرومات الصوتية المؤقتة (Join to Create)",
  category: "رومات صوتية",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  options: [
    {
      name: "join_channel",
      description: "القناة الصوتية التي عند الانضمام إليها يُنشأ روم مؤقت (Join to Create)",
      type: "channel",
      required: true
    },
    {
      name: "category",
      description: "التصنيف الذي تُنشأ تحته الرومات الصوتية المؤقتة (اختياري)",
      type: "channel",
      required: false
    }
  ],
  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ content: "❌ تحتاج صلاحية `إدارة السيرفر` لاستخدام هذا الأمر." });
      return;
    }

    const joinChannel = ctx.getChannel("join_channel");
    const category = ctx.getChannel("category");

    if (!joinChannel || joinChannel.type !== ChannelType.GuildVoice) {
      await ctx.reply({
        content: "❌ يجب اختيار قناة صوتية صالحة لتكون قناة الانضمام (Join to Create)."
      });
      return;
    }

    if (category && category.type !== ChannelType.GuildCategory) {
      await ctx.reply({
        content: "❌ التصنيف المُحدد غير صالح، يرجى اختيار تصنيف (Category) فعلي."
      });
      return;
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: ctx.guild.id },
      {
        $set: {
          "tempVoice.enabled": true,
          "tempVoice.joinToCreateChannelId": joinChannel.id,
          "tempVoice.categoryId": category?.id ?? null
        }
      },
      { upsert: true }
    );

    invalidateGuildConfigCache(ctx.client, ctx.guild.id);

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("✅ تم إعداد نظام الرومات الصوتية المؤقتة")
      .setDescription("سيقوم البوت الآن بإنشاء روم صوتي مؤقت تلقائياً لكل عضو ينضم لقناة الانضمام.")
      .addFields(
        { name: "قناة الانضمام", value: `<#${joinChannel.id}>`, inline: true },
        {
          name: "التصنيف",
          value: category ? `<#${category.id}>` : "نفس تصنيف قناة الانضمام",
          inline: true
        }
      );

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
