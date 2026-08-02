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
      name: "category",
      description: "التصنيف الذي تُنشأ تحته رومات اللوق (اختياري)",
      type: "channel",
      required: false
    }
  ],
  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ content: "❌ تحتاج صلاحية `إدارة السيرفر` لاستخدام هذا الأمر." });
      return;
    }

    const category = ctx.getChannel("category");

    if (category && category.type !== ChannelType.GuildCategory) {
      await ctx.reply({
        content: "❌ التصنيف المُحدد غير صالح، يرجى اختيار تصنيف (Category) فعلي."
      });
      return;
    }

    // التحقق من التصنيف المحفوظ في الإعدادات أولاً
    const guildConfig = await GuildConfig.findOne({ guildId: ctx.guild.id });
    let logCategory = category;

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
          name: "📋 السجلات",
          type: ChannelType.GuildCategory
        });
      } catch (error) {
        await ctx.reply({ content: "❌ فشل في إنشاء التصنيف. تأكد من أن لدي صلاحيات كافية." });
        return;
      }
    }

    // أسماء الرومات مع الأيقونات
    const logChannels = [
      { key: "messageDelete", name: "🗑️ حذف-الرسائل" },
      { key: "messageEdit", name: "✏️ تعديل-الرسائل" },
      { key: "memberJoin", name: "📥 انضمام-الأعضاء" },
      { key: "memberLeave", name: "📤 مغادرة-الأعضاء" },
      { key: "memberUpdate", name: "🧑‍🤝‍🧑 تحديث-الأعضاء" },
      { key: "voiceUpdate", name: "🎙️ الحركة-الصوتية" },
      { key: "channelUpdate", name: "📁 تعديلات-الرومات" },
      { key: "roleUpdate", name: "🎖️ تعديلات-الرتب" },
      { key: "moderation", name: "🛡️ الإشراف" },
      { key: "server", name: "📋 عام" },
      { key: "commandUsage", name: "⚡ استخدام-الأوامر" },
      { key: "ticketCreate", name: "🎫 إنشاء-التذاكر" },
      { key: "ticketClose", name: "🔒 إغلاق-التذاكر" },
      { key: "levelUp", name: "⬆️ صعود-المستويات" },
      { key: "reactionAdd", name: "👍 إضافة-التفاعلات" },
      { key: "reactionRemove", name: "👎 إزالة-التفاعلات" },
      { key: "threadCreate", name: "🧵 إنشاء-المواضيع" },
      { key: "threadDelete", name: "✂️ حذف-المواضيع" },
      { key: "inviteCreate", name: "✉️ إنشاء-الدعوات" },
      { key: "inviteDelete", name: "🗑️ حذف-الدعوات" },
      { key: "emojiCreate", name: "😀 إنشاء-الإيموجي" },
      { key: "emojiDelete", name: "😢 حذف-الإيموجي" },
      { key: "emojiUpdate", name: "🔄 تعديل-الإيموجي" },
      { key: "stickerCreate", name: "🏷️ إنشاء-الملصقات" },
      { key: "stickerDelete", name: "🗑️ حذف-الملصقات" }
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
