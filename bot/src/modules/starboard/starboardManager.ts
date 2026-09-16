import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageReaction,
  TextChannel,
  User
} from "discord.js";
import { IGuildConfig, StarboardEntry, resolveStarboardSettings } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { logError } from "../../utils/logger";
import { recordDbRead, recordDbWrite, recordStarboardApiUpdate, recordStarboardReaction } from "../../utils/metrics";

/**
 * لوحة النجوم — event-driven بالكامل:
 * reaction → كاش الإعدادات → عدّاد Discord → إجراء فقط عند تغيّر الحالة.
 * لا DB لكل reaction (فقط للرسائل المنشورة)، ولا API إلا عند النشر/التحديث/الحذف
 * مع دمج التحديثات المتتالية (debounce).
 */

interface TrackedMessage {
  count: number;
  channelId: string;
  starboardChannelId?: string;
  starboardMsgId?: string;
  firstSeen: number;
  timer: NodeJS.Timeout | null;
}

/** حد أعلى للرسائل المتتبعة — FIFO */
const MAX_TRACKED = 2000;
/** دمج تحديثات العدّاد المتتالية */
const UPDATE_DEBOUNCE_MS = 2_000;
/** إهمال التتبع بعد 7 أيام */
const TRACK_TTL_MS = 7 * 24 * 60 * 60_000;

const tracked = new Map<string, TrackedMessage>();

/**
 * حماية من النشر المكرر: حدّان متزامنان يبلغان العتبة معًا
 * (الفاصل بين الفحص والنشر يتضمن awaits) — يُسجَّل المفتاح
 * تزامنيًا قبل أول await في مسار النشر.
 */
const posting = new Set<string>();

const keyOf = (guildId: string, messageId: string) => `${guildId}:${messageId}`;

function pruneTracked(): void {
  if (tracked.size <= MAX_TRACKED) return;
  for (const [key, entry] of tracked) {
    if (entry.timer) clearTimeout(entry.timer);
    tracked.delete(key);
    if (tracked.size <= MAX_TRACKED) break;
  }
}

function buildStarboardEmbed(message: Message, count: number, emoji: string): EmbedBuilder {
  const avatarURL = message.author?.displayAvatarURL();
  const embed = new EmbedBuilder()
    .setColor(0xffac33)
    .setAuthor({
      name: message.author?.tag ?? "مستخدم",
      ...(avatarURL ? { iconURL: avatarURL } : {})
    })
    .setTitle(`${emoji} ${count}`)
    .setTimestamp(message.createdAt ?? new Date())
    .setFooter({ text: `في #${(message.channel as TextChannel)?.name ?? "?"} • ${message.id}` });
  const text = message.content?.slice(0, 2000);
  if (text) embed.setDescription(text);
  const image = message.attachments.find((a) => a.contentType?.startsWith("image/"));
  if (image) embed.setImage(image.proxyURL || image.url);
  return embed;
}

function jumpRow(message: Message): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("عرض الرسالة").setStyle(ButtonStyle.Link).setURL(message.url)
  );
}

async function resolveFullMessage(
  reaction: MessageReaction
): Promise<{ message: Message; partialFetched: boolean }> {
  if (!reaction.message.partial) return { message: reaction.message as Message, partialFetched: false };
  const message = (await reaction.message.fetch().catch(() => null)) as Message | null;
  if (!message) throw new Error("تعذر جلب الرسالة");
  return { message, partialFetched: true };
}

async function isAuthorAllowed(
  guildId: string,
  message: Message,
  minAccountAgeDays: number,
  ignoredRoleIds: string[],
  ignoredUserIds: string[]
): Promise<boolean> {
  const author = message.author;
  if (!author || author.bot) return false;
  if (ignoredUserIds.includes(author.id)) return false;
  if (minAccountAgeDays > 0) {
    const ageDays = (Date.now() - author.createdTimestamp) / (24 * 60_60000);
    if (ageDays < minAccountAgeDays) return false;
  }
  if (ignoredRoleIds.length > 0) {
    const guild = message.guild;
    if (!guild) return false;
    // الكاش أولًا — جلب واحد فقط عند الحاجة
    let member = guild.members.cache.get(author.id) as GuildMember | undefined;
    if (!member) {
      try {
        member = (await guild.members.fetch(author.id)) as GuildMember;
      } catch {
        return false;
      }
    }
    if (ignoredRoleIds.some((id) => member!.roles.cache.has(id))) return false;
  }
  return true;
}

async function postToStarboard(
  client: ExtendedClient,
  guildId: string,
  message: Message,
  count: number,
  channelId: string,
  emoji: string
): Promise<void> {
  const guild = message.guild;
  if (!guild) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  const sent = (await (channel as TextChannel)
    .send({ embeds: [buildStarboardEmbed(message, count, emoji)], components: [jumpRow(message)] })
    .catch((err) => {
      logError("starboard/post", err);
      return null;
    })) as Message | null;
  if (!sent) return;
  recordStarboardApiUpdate();

  tracked.set(keyOf(guildId, message.id), {
    count,
    channelId: message.channelId,
    starboardChannelId: channelId,
    starboardMsgId: sent.id,
    firstSeen: Date.now(),
    timer: null
  });
  pruneTracked();

  try {
    recordDbWrite();
    await StarboardEntry.findOneAndUpdate(
      { key: keyOf(guildId, message.id) },
      {
        $set: {
          key: keyOf(guildId, message.id),
          guildId,
          channelId: message.channelId,
          messageId: message.id,
          authorId: message.author?.id ?? "",
          starboardChannelId: channelId,
          starboardMessageId: sent.id,
          count,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  } catch (err) {
    logError("starboard/persist", err);
  }
}

async function updatePostedMessage(
  client: ExtendedClient,
  guildId: string,
  messageId: string,
  entry: TrackedMessage,
  emoji: string
): Promise<void> {
  if (!entry.starboardMsgId || !entry.starboardChannelId) return;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const sbChannel = guild.channels.cache.get(entry.starboardChannelId);
  if (!sbChannel?.isTextBased()) return;
  const textChannel = sbChannel as TextChannel;
  let sbMessage: Message | undefined = textChannel.messages.cache.get(entry.starboardMsgId);
  if (!sbMessage) {
    // جلب واحد فقط عند الحاجة (بعد debounce)
    try {
      const fetched = await textChannel.messages.fetch(entry.starboardMsgId).catch(() => null);
      sbMessage = (fetched ?? undefined) as Message | undefined;
    } catch {
      sbMessage = undefined;
    }
  }
  if (!sbMessage) {
    // رسالة اللوحة محذوفة — نظّف الحالة والسجل
    tracked.delete(keyOf(guildId, messageId));
    try {
      await StarboardEntry.deleteOne({ key: keyOf(guildId, messageId) });
    } catch (err) {
      logError("starboard/cleanup", err);
    }
    return;
  }
  try {
    const original = sbMessage.embeds[0];
    const embed = original
      ? EmbedBuilder.from(original).setTitle(`${emoji} ${entry.count}`)
      : new EmbedBuilder().setColor(0xffac33).setTitle(`${emoji} ${entry.count}`);
    await sbMessage.edit({ embeds: [embed] });
    recordStarboardApiUpdate();
    try {
      recordDbWrite();
      await StarboardEntry.findOneAndUpdate(
        { key: keyOf(guildId, messageId) },
        { $set: { count: entry.count, updatedAt: new Date() } }
      );
    } catch (err) {
      logError("starboard/persist-count", err);
    }
  } catch (err) {
    logError("starboard/update", err);
  }
}

function scheduleUpdate(
  client: ExtendedClient,
  guildId: string,
  messageId: string,
  entry: TrackedMessage,
  emoji: string
): void {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void updatePostedMessage(client, guildId, messageId, entry, emoji);
  }, UPDATE_DEBOUNCE_MS);
  entry.timer.unref?.();
}

async function removeFromStarboard(
  client: ExtendedClient,
  guildId: string,
  messageId: string,
  entry: TrackedMessage,
  remove: boolean
): Promise<void> {
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  if (remove && entry.starboardMsgId && entry.starboardChannelId) {
    const guild = client.guilds.cache.get(guildId);
    const sbChannel = guild?.channels.cache.get(entry.starboardChannelId);
    if (sbChannel?.isTextBased()) {
      try {
        const msg = await (sbChannel as TextChannel).messages.fetch(entry.starboardMsgId).catch(() => null);
        if (msg) {
          await (msg as Message).delete().catch(() => null);
          recordStarboardApiUpdate();
        }
      } catch {
        // تجاهل — الرسالة محذوفة على الأرجح
      }
    }
    tracked.delete(keyOf(guildId, messageId));
    try {
      recordDbWrite();
      await StarboardEntry.deleteOne({ key: keyOf(guildId, messageId) });
    } catch (err) {
      logError("starboard/delete", err);
    }
  } else {
    tracked.delete(keyOf(guildId, messageId));
  }
}

async function handleReaction(
  client: ExtendedClient,
  reaction: MessageReaction,
  user: User,
  added: boolean
): Promise<void> {
  recordStarboardReaction();
  try {
    if (user.bot) return;
    // تفاعل جزئي (uncached) — جلب واحد فقط، وإلا لا اسم إيموجي ولا عدّاد موثوق
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const gConfig = await getGuildConfig(client, guildId);
    const cfg = resolveStarboardSettings(gConfig as IGuildConfig);
    if (!cfg.enabled || !cfg.channelId) return;
    if ((reaction.emoji.name ?? "") !== cfg.emoji) return;
    if (reaction.message.channelId === cfg.channelId) return; // تجاهل تفاعلات قناة اللوحة نفسها
    if (cfg.ignoredChannelIds.includes(reaction.message.channelId)) return;

    const key = keyOf(guildId, reaction.message.id);
    const count = reaction.count ?? 1;
    let entry = tracked.get(key);

    if (!entry && added && count >= cfg.threshold) {
      // استعادة من DB للرسائل المنشورة قبل إعادة التشغيل — فقط عند بلوغ الحد
      recordDbRead();
      const existing = await StarboardEntry.findOne({ key }).catch(() => null);
      if (existing) {
        entry = {
          count: existing.count,
          channelId: existing.channelId,
          starboardChannelId: existing.starboardChannelId,
          starboardMsgId: existing.starboardMessageId,
          firstSeen: Date.now(),
          timer: null
        };
        tracked.set(key, entry);
        pruneTracked();
      }
    }

    if (entry?.starboardMsgId) {
      if (Date.now() - entry.firstSeen > TRACK_TTL_MS) {
        tracked.delete(key);
        return;
      }
      if (count === entry.count) return; // لا تغيّر → لا عمل
      entry.count = count;
      if (count < cfg.threshold) {
        await removeFromStarboard(client, guildId, reaction.message.id, entry, cfg.removeOnBelowThreshold);
      } else {
        scheduleUpdate(client, guildId, reaction.message.id, entry, cfg.emoji);
      }
      return;
    }

    if (!added || count < cfg.threshold) {
      // تتبع خفيف للعدّاد قبل الوصول للحد (بلا DB)
      if (added && !tracked.has(key)) {
        tracked.set(key, {
          count,
          channelId: reaction.message.channelId,
          firstSeen: Date.now(),
          timer: null
        });
        pruneTracked();
      } else if (tracked.has(key)) {
        tracked.get(key)!.count = count;
      }
      return;
    }

    // الوصول للحد لأول مرة — التحقق الكامل ثم النشر
    if (posting.has(key)) return; // نشر جارٍ من حدث موازٍ
    posting.add(key);
    try {
      let message: Message;
      try {
        ({ message } = await resolveFullMessage(reaction));
      } catch {
        tracked.delete(key);
        return;
      }
      const allowed = await isAuthorAllowed(
        guildId,
        message,
        cfg.minAccountAgeDays,
        cfg.ignoredRoleIds,
        cfg.ignoredUserIds
      );
      if (!allowed) {
        tracked.delete(key);
        return;
      }
      tracked.delete(key);
      await postToStarboard(client, guildId, message, count, cfg.channelId, cfg.emoji);
    } finally {
      posting.delete(key);
    }
  } catch (err) {
    logError("starboard/reaction", err);
  }
}

export async function handleStarboardAdd(client: ExtendedClient, reaction: MessageReaction, user: User): Promise<void> {
  await handleReaction(client, reaction, user, true);
}

export async function handleStarboardRemove(client: ExtendedClient, reaction: MessageReaction, user: User): Promise<void> {
  await handleReaction(client, reaction, user, false);
}

/** للاختبار والمراقبة */
export function trackedStarboardCount(): number {
  return tracked.size;
}

export function clearStarboardState(): void {
  for (const entry of tracked.values()) {
    if (entry.timer) clearTimeout(entry.timer);
  }
  tracked.clear();
}
