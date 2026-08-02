import { ChannelType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { GuildConfig } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { invalidateGuildConfigCache } from "../../utils/guildConfig";

const command: BotCommand = {
  name: "setup-logs",
  description: "إعداد نظام السجلات تلقائياً (إنشاء رومات اللوق)",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  options: [
    {
      name: "channel",
      description: "الروم الذي تُنشأ تحته رومات اللوق (اختياري)",
      type: "channel",
      required: false
    }
  ],
  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ content: "❌ تحتاج صلاحية `إدارة السيرفر` لاستخدام هذا الأمر." });
      return;
    }

    const channel = ctx.getChannel("channel");

    if (channel && channel.type !== ChannelType.GuildCategory) {
      await ctx.reply({
        content: "❌ الروم المُحدد غير صالح، يرجى اختيار تصنيف (Category) فعلي."
      });
      return;
    }

    // التحقق من التصنيف المحفوظ في الإعدادات أولاً
    const guildConfig = await GuildConfig.findOne({ guildId: ctx.guild.id });
    let logCategory = channel;

    if (!logCategory && guildConfig?.logging?.categoryId) {
      try {
        const fetchedChannel = await ctx.guild.channels.fetch(guildConfig.logging.categoryId);
        if (fetchedChannel?.type === ChannelType.GuildCategory) {
          logCategory = fetchedChannel;
        }
      } catch {
        // التصنيف المحفوظ غير موجود، نتجاهله
      }
    }

    // إنشاء التصنيف إذا لم يُحدد ولم يكن محفوظاً
    if (!logCategory) {
      try {
        logCategory = await ctx.guild.channels.create({
          name: "log-mod",
          type: ChannelType.GuildCategory
        });
      } catch (error) {
        await ctx.reply({ content: "❌ فشل في إنشاء التصنيف. تأكد من أن لدي صلاحيات كافية." });
        return;
      }
    }

    // أسماء الرومات الجديدة
    const logChannels = [
      { key: "moderation", name: "〢log-mod" },
      { key: "members", name: "〢log-members" },
      { key: "messages", name: "〢log-messages" },
      { key: "voice", name: "〢log-voice" },
      { key: "actions", name: "〢log-actions" },
      { key: "files", name: "〢log-files" },
      { key: "server", name: "〢log-server" },
      { key: "roles", name: "〢log-roles" },
      { key: "channels", name: "〢log-channels" },
      { key: "other", name: "〢other logs" }
    ];

    const createdChannels: { key: string; id: string; name: string }[] = [];
    const failedChannels: string[] = [];

    // إنشاء الرومات
    for (const logChannel of logChannels) {
      try {
        const channel = await ctx.guild.channels.create({
          name: logChannel.name,
          type: ChannelType.GuildText,
          parent: logCategory.id,
          permissionOverwrites: [
            {
              id: ctx.guild.id,
              deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            },
            {
              id: ctx.client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
            }
          ]
        });
        createdChannels.push({ key: logChannel.key, id: channel.id, name: logChannel.name });
      } catch (error) {
        failedChannels.push(logChannel.name);
      }
    }

    // تحديث الإعدادات في قاعدة البيانات
    const channelMap: Record<string, string> = {};
    createdChannels.forEach(ch => {
      channelMap[`logging.channels.${ch.key}`] = ch.id;
    });

    await GuildConfig.findOneAndUpdate(
      { guildId: ctx.guild.id },
      {
        $set: {
          "logging.enabled": true,
          "logging.categoryId": logCategory.id,
          ...channelMap
        }
      },
      { upsert: true }
    );

    invalidateGuildConfigCache(ctx.client, ctx.guild.id);

    // إرسال رسالة النتيجة
    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("✅ تم إعداد نظام السجلات")
      .setDescription(`تم إنشاء ${createdChannels.length} روم لوج في التصنيف <#${logCategory.id}>`)
      .addFields(
        { name: "التصنيف", value: `<#${logCategory.id}>`, inline: true },
        { name: "الرومات المُنشأة", value: `${createdChannels.length}`, inline: true }
      );

    if (failedChannels.length > 0) {
      embed.addFields({
        name: "فشل إنشاء",
        value: failedChannels.join(", "),
        inline: false
      });
    }

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
