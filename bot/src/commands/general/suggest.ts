import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { Suggestion } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";
import { config } from "../../config";

function buildSuggestionEmbed(content: string, userTag: string, status: string) {
  const statusMap: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    implemented: "تم التنفيذ"
  };
  return new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`اقتراح من ${userTag}`)
    .setDescription(content)
    .setFooter({ text: `الحالة: ${statusMap[status] ?? status}` })
    .setTimestamp();
}

const command: BotCommand = {
  name: "suggest",
  description: "إرسال اقتراح",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "suggestion", description: "نص الاقتراح", type: "string", required: true }
  ],
  async run(ctx) {
    const suggestionText = ctx.getString("suggestion");
    if (!suggestionText) {
      await ctx.reply({ content: "يرجى كتابة نص الاقتراح." });
      return;
    }

    if (suggestionText.length > 1000) {
      await ctx.reply({ content: "الاقتراح طويل جدًا — الحد الأقصى 1000 حرف." });
      return;
    }

    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);
    const suggestionConfig = (gConfig as any).suggestions;

    if (suggestionConfig && !suggestionConfig.enabled) {
      await ctx.reply({ content: "نظام الاقتراحات معطل حاليًا في هذا السيرفر." });
      return;
    }

    const suggestionId = `${Date.now()}-${ctx.user.id.slice(-4)}`;

    const suggestionData = {
      id: suggestionId,
      guildId: ctx.guild.id,
      userId: ctx.user.id,
      userName: ctx.user.tag,
      userAvatar: ctx.user.displayAvatarURL(),
      content: suggestionText,
      status: "pending" as const,
      upvotes: [],
      downvotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await Suggestion.create(suggestionData as any);
    } catch (err) {
      console.error("[suggest] فشل حفظ الاقتراح:", err);
    }

    const embed = buildSuggestionEmbed(suggestionText, ctx.user.tag, "pending");

    // أزرار التصويت
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`suggest:up:${suggestionId}`).setLabel("0").setStyle(ButtonStyle.Success).setEmoji("👍"),
      new ButtonBuilder().setCustomId(`suggest:down:${suggestionId}`).setLabel("0").setStyle(ButtonStyle.Danger).setEmoji("👎"),
      new ButtonBuilder().setCustomId(`suggest:status:${suggestionId}`).setLabel("قيد المراجعة").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    // إرسال في قناة الاقتراحات إن وُجدت، وإلا رد مباشر
    const targetChannelId = suggestionConfig?.channelId;
    let messageId: string | undefined;

    if (targetChannelId) {
      try {
        const channel = (await ctx.guild.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;
        if (channel?.isTextBased()) {
          const msg = await (channel as TextChannel).send({ embeds: [embed], components: [row] });
          messageId = msg.id;
          await Suggestion.findOneAndUpdate({ id: suggestionId }, { $set: { channelId: targetChannelId, messageId } }).catch(() => null);
          await ctx.reply({ content: `تم إرسال اقتراحك في <#${targetChannelId}> بنجاح.` });
          return;
        }
      } catch (err) {
        console.error("[suggest] فشل الإرسال للقناة:", err);
      }
    }

    const reply = await ctx.reply({ embeds: [embed], components: [row] });
    // محاولة حفظ معرف الرسالة للتصويت
    try {
      const msg = reply as any;
      if (msg?.id) {
        await Suggestion.findOneAndUpdate({ id: suggestionId }, { $set: { messageId: msg.id } }).catch(() => null);
      }
    } catch {}
  }
};

export default command;
