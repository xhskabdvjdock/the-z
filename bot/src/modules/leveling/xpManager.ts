import { ChannelType, GuildMember, GuildTextBasedChannel, Message, VoiceChannel } from "discord.js";
import { ExtendedClient } from "../../client";
import { ILevelUser, IGuildConfig, LevelUser, levelFromTotalXp, LiveDoc } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";
import { buildMessageFromCustom } from "../../utils/embed";
import { logError } from "../../utils/logger";
import {
  recordDbRead,
  recordDbWrite,
  recordDiscordApiCall,
  recordXpAccumulated,
  recordXpFlushed
} from "../../utils/metrics";
import { trackXp } from "../analytics/analytics";
import { registerFlushHandler, registerRecurring } from "../../scheduler/scheduler";

/**
 * خبرة مجمّعة (batched): الرسائل تتراكم في الذاكرة فقط، والتفريغ لقاعدة
 * البيانات يتم مرة كل دقيقة عبر المجدول المركزي — لا كتابة لكل رسالة.
 */

export const XP_FLUSH_MS = 60_000;
/** حد أعلى للإدخالات المعلقة — عند تجاوزه يُحفَّز تفريغ فوري */
const MAX_PENDING_ENTRIES = 5000;
/** حد خريطة البرودة + تنظيف دوري */
const MAX_COOLDOWN_ENTRIES = 10000;

interface PendingEntry {
  xp: number;
  voiceMinutes: number;
  lastChannelId?: string;
  lastMessageAt?: number;
}

const pending = new Map<string, PendingEntry>();
const lastAwardAt = new Map<string, number>();

const keyOf = (guildId: string, userId: string) => `${guildId}:${userId}`;

function pruneCooldownMap(): void {
  if (lastAwardAt.size <= MAX_COOLDOWN_ENTRIES) return;
  const cutoff = Date.now() - 60 * 60_000;
  for (const [k, ts] of lastAwardAt) {
    if (ts < cutoff) lastAwardAt.delete(k);
    if (lastAwardAt.size <= MAX_COOLDOWN_ENTRIES) break;
  }
}

/** يرسل رسالة الترقية للمستوى الجديد حسب إعدادات السيرفر */
async function announceLevelUp(
  client: ExtendedClient,
  guildId: string,
  member: GuildMember,
  userId: string,
  newLevel: number,
  gConfig: IGuildConfig,
  fallbackChannelId?: string
): Promise<void> {
  const custom = gConfig.leveling.levelUpMessage;
  if (!custom?.enabled) return;

  let targetChannel: GuildTextBasedChannel | null = null;

  // الكاش فقط — لا REST إضافي من أجل رسالة ترقية
  if (gConfig.leveling.announceInChannel) {
    if (gConfig.leveling.levelUpChannelId) {
      const ch = client.channels.cache.get(gConfig.leveling.levelUpChannelId);
      if (ch?.isTextBased()) targetChannel = ch as GuildTextBasedChannel;
    }
  } else if (fallbackChannelId) {
    const ch = client.channels.cache.get(fallbackChannelId);
    if (ch?.isTextBased()) targetChannel = ch as GuildTextBasedChannel;
  }

  if (!targetChannel) return;

  const payload = buildMessageFromCustom(custom, {
    user: {
      id: userId,
      username: member.user.username,
      tag: member.user.tag,
      mention: `<@${userId}>`,
      avatarURL: member.user.displayAvatarURL()
    },
    server: {
      name: member.guild.name,
      id: member.guild.id,
      memberCount: member.guild.memberCount,
      iconURL: member.guild.iconURL() ?? undefined
    },
    extra: { level: newLevel }
  });

  await targetChannel.send(payload as any).catch(() => {});
}

/** يمنح مكافآت الرتب المستحقة عند الترقية، ويزيل الرتب الأقل إن كان removePrevious مفعّلاً */
async function grantRoleRewards(member: GuildMember, newLevel: number, gConfig: IGuildConfig): Promise<void> {
  const rewards = gConfig.leveling.roleRewards ?? [];
  if (!rewards.length) return;

  const eligible = rewards.filter((r) => r.level <= newLevel);
  if (!eligible.length) return;

  const roleIdsToAdd = eligible.map((r) => r.roleId).filter((id) => !member.roles.cache.has(id));
  if (roleIdsToAdd.length) {
    await member.roles.add(roleIdsToAdd).catch(() => {});
  }

  for (const reward of eligible) {
    if (!reward.removePrevious) continue;
    const lowerRoleIds = rewards
      .filter((r) => r.level < reward.level && r.roleId !== reward.roleId)
      .map((r) => r.roleId)
      .filter((id) => member.roles.cache.has(id));
    if (lowerRoleIds.length) {
      await member.roles.remove(lowerRoleIds).catch(() => {});
    }
  }
}

/** يتحقق مما إذا كانت القناة أو رتب العضو ضمن قوائم الاستثناء */
function isIgnored(gConfig: IGuildConfig, channelId: string, member: GuildMember): boolean {
  if (gConfig.leveling.ignoredChannelIds?.includes(channelId)) return true;
  if (
    gConfig.leveling.ignoredRoleIds?.length &&
    member.roles.cache.hasAny(...gConfig.leveling.ignoredRoleIds)
  ) {
    return true;
  }
  return false;
}

/** يعالج منح الخبرة عند إرسال رسالة نصية — تراكم في الذاكرة فقط، بلا أي DB */
export async function handleMessageXp(
  client: ExtendedClient,
  message: Message,
  gConfig: IGuildConfig
): Promise<void> {
  if (!gConfig.leveling.enabled) return;
  if (!message.guild || !message.member) return;
  if (isIgnored(gConfig, message.channelId, message.member)) return;

  const key = keyOf(message.guild.id, message.author.id);
  const now = Date.now();
  const cooldownMs = (gConfig.leveling.messageCooldownSeconds ?? 60) * 1000;
  if (now - (lastAwardAt.get(key) ?? 0) < cooldownMs) return;
  lastAwardAt.set(key, now);
  pruneCooldownMap();

  const { min, max } = gConfig.leveling.xpPerMessage;
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;

  const entry = pending.get(key) ?? { xp: 0, voiceMinutes: 0 };
  entry.xp += amount;
  entry.lastMessageAt = now;
  entry.lastChannelId = message.channelId;
  pending.set(key, entry);
  recordXpAccumulated();
}

/** يجمع دقائق الصوت للأعضاء النشطين — تراكم فقط، بلا أي DB */
export async function collectVoiceXp(client: ExtendedClient): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    try {
      const gConfig = await getGuildConfig(client, guild.id);
      if (!gConfig.leveling.enabled) continue;

      const voiceChannels = guild.channels.cache.filter(
        (c): c is VoiceChannel => c.type === ChannelType.GuildVoice
      );

      for (const channel of voiceChannels.values()) {
        if (gConfig.leveling.ignoredChannelIds?.includes(channel.id)) continue;
        for (const member of channel.members.values()) {
          if (member.user.bot) continue;
          if (isIgnored(gConfig, channel.id, member)) continue;
          const key = keyOf(guild.id, member.id);
          const entry = pending.get(key) ?? { xp: 0, voiceMinutes: 0 };
          entry.xp += gConfig.leveling.xpPerVoiceMinute;
          entry.voiceMinutes += 1;
          pending.set(key, entry);
          recordXpAccumulated();
        }
      }
    } catch (err) {
      logError("xp-voice-collect", err);
    }
  }
}

/** يفرّغ المتراكم لقاعدة البيانات دفعة واحدة (قراءة جماعية + كتابة لكل مستخدم نشط فقط) */
export async function flushXp(client: ExtendedClient): Promise<void> {
  if (pending.size === 0) return;

  const byGuild = new Map<string, string[]>();
  for (const key of pending.keys()) {
    const sep = key.indexOf(":");
    const guildId = key.slice(0, sep);
    const userId = key.slice(sep + 1);
    const list = byGuild.get(guildId) ?? [];
    list.push(userId);
    byGuild.set(guildId, list);
  }

  for (const [guildId, userIds] of byGuild) {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        // السيرفر غادر — أسقط المعلق الخاص به
        for (const userId of userIds) pending.delete(keyOf(guildId, userId));
        continue;
      }
      const gConfig = await getGuildConfig(client, guildId);

      recordDbRead();
      const existingDocs = await LevelUser.find({ guildId, userId: { $in: userIds } });
      const docMap = new Map(existingDocs.map((d) => [d.userId, d]));

      let flushedXp = 0;
      let flushedLevelups = 0;
      for (const userId of userIds) {
        const key = keyOf(guildId, userId);
        const entry = pending.get(key);
        if (!entry) continue;
        pending.delete(key);

        try {
          let doc = docMap.get(userId);
          if (!doc) {
            recordDbWrite();
            doc = await LevelUser.create({ guildId, userId });
          }
          flushedXp += entry.xp;
          if (await applyPendingXp(client, guildId, userId, doc as LiveDoc<ILevelUser>, entry, gConfig)) {
            flushedLevelups++;
          }
          recordXpFlushed();
        } catch (err) {
          logError("xp-flush", err);
        }
      }
      trackXp(guildId, flushedXp, flushedLevelups);
    } catch (err) {
      logError("xp-flush", err);
    }
  }
}

async function applyPendingXp(
  client: ExtendedClient,
  guildId: string,
  userId: string,
  doc: LiveDoc<ILevelUser>,
  entry: PendingEntry,
  gConfig: IGuildConfig
): Promise<boolean> {
  const oldLevel = doc.level ?? 0;

  doc.totalXp = (doc.totalXp ?? 0) + entry.xp;
  doc.voiceMinutes = (doc.voiceMinutes ?? 0) + entry.voiceMinutes;
  if (entry.lastMessageAt) doc.lastMessageAt = new Date(entry.lastMessageAt);
  const info = levelFromTotalXp(doc.totalXp);
  doc.level = info.level;
  doc.xp = info.currentLevelXp;

  recordDbWrite();
  await doc.save();

  if (info.level <= oldLevel) return false;

  // ترقية — نجلب العضو من الكاش أولًا لتجنب REST
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return true;
  let member = guild.members.cache.get(userId) ?? null;
  if (!member) {
    try {
      recordDiscordApiCall();
      member = await guild.members.fetch(userId);
    } catch {
      return true;
    }
  }
  await grantRoleRewards(member, info.level, gConfig);
  await announceLevelUp(client, guildId, member, userId, info.level, gConfig, entry.lastChannelId);
  return true;
}

/** تسجيل مهام XP في المجدول المركزي + تفريغ عند الإغلاق */
export function registerXpScheduler(client: ExtendedClient): void {
  registerRecurring("xp-tick", XP_FLUSH_MS, async (c) => {
    await collectVoiceXp(c);
    await flushXp(c);
  });
  registerFlushHandler("xp", () => flushXp(client));
}

/** للاختبار والمراقبة */
export function getPendingXpCount(): number {
  return pending.size;
}

export function clearXpState(): void {
  pending.clear();
  lastAwardAt.clear();
}
