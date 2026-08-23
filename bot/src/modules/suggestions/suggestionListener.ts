import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, Message } from "discord.js";
import { Suggestion } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";
import { generateSuggestionImage } from "./suggestionImage";

export async function handleSuggestionMessage(message: Message): Promise<boolean> {
  if (message.author.bot || !message.guild) return false;
  if (!message.content || message.content.trim().length === 0) return false;

  const gConfig = await getGuildConfig((message as any).client, message.guild.id);
  const suggestions = (gConfig as any).suggestions;
  if (!suggestions?.enabled || !suggestions?.channelId) return false;
  if (message.channelId !== suggestions.channelId) return false;

  // تجاهل أوامر البوت
  if (message.content.startsWith(gConfig.prefix)) return false;

  const content = message.content.trim();
  if (content.length > 500) {
    await message.reply({ content: "الاقتراح طويل جدًا — الحد الأقصى 500 حرف." }).then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
    await message.delete().catch(() => null);
    return true;
  }

  // حذف الرسالة الأصلية
  await message.delete().catch(() => null);

  const suggestionId = `${Date.now()}-${message.author.id.slice(-4)}`;

  // حفظ في قاعدة البيانات
  const suggestionData = {
    id: suggestionId,
    guildId: message.guild.id,
    userId: message.author.id,
    userName: message.author.tag,
    userAvatar: message.author.displayAvatarURL({ extension: "png", size: 256 }),
    content,
    status: "pending" as const,
    upvotes: [],
    downvotes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await Suggestion.create(suggestionData as any);
  } catch (err) {
    console.error("[suggestions] فشل حفظ الاقتراح:", err);
  }

  // توليد الصورة
  let buffer: Buffer | null = null;
  try {
    buffer = await generateSuggestionImage(
      {
        username: message.author.username,
        tag: message.author.tag,
        avatarURL: message.author.displayAvatarURL({ extension: "png", size: 256 })
      },
      content,
      {
        backgroundUrl: suggestions.backgroundImage,
        titleText: suggestions.imageTitle,
        titleColor: suggestions.imageTitleColor,
        usernameColor: suggestions.usernameColor,
        tagColor: suggestions.tagColor,
        contentColor: suggestions.contentColor,
        footerText: suggestions.footerText,
        footerColor: suggestions.footerColor
      }
    );
  } catch (err) {
    console.error("[suggestions] فشل توليد الصورة:", err);
  }

  const attachment = buffer ? new AttachmentBuilder(buffer, { name: "suggestion.png" }) : null;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`suggest:up:${suggestionId}`).setLabel("0").setStyle(ButtonStyle.Success).setEmoji("👍"),
    new ButtonBuilder().setCustomId(`suggest:down:${suggestionId}`).setLabel("0").setStyle(ButtonStyle.Danger).setEmoji("👎"),
    new ButtonBuilder().setCustomId(`suggest:status:${suggestionId}`).setLabel("قيد المراجعة").setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  try {
    const channel = message.channel as any;
    const sent = await channel.send({
      content: `<@${message.author.id}>`,
      files: attachment ? [attachment] : undefined,
      components: [row]
    });

    // حفظ معرف الرسالة
    await Suggestion.findOneAndUpdate({ id: suggestionId }, { $set: { messageId: sent.id, channelId: message.channelId } }).catch(() => null);

    // إنشاء ثريد إن مفعل
    if (suggestions.autoThread && sent.startThread) {
      await sent.startThread({ name: `نقاش: ${content.slice(0, 50)}`, autoArchiveDuration: 1440 }).catch(() => null);
    }
  } catch (err) {
    console.error("[suggestions] فشل إرسال صورة الاقتراح:", err);
  }

  return true;
}