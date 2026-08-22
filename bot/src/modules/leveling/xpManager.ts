import { ChannelType, GuildMember, GuildTextBasedChannel, Message, VoiceChannel } from "discord.js";
import { ExtendedClient } from "../../client";
import { ILevelUser, IGuildConfig, LevelUser, levelFromTotalXp, LiveDoc } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";
import { buildMessageFromCustom } from "../../utils/embed";
import { logError } from "../../utils/logger";

/** يجلب مستند مستخدم الخبرة أو ينشئه إن لم يكن موجوداً */
async function getOrCreateLevelUser(guildId: string, userId: string): Promise<LiveDoc<ILevelUser>> {
  let doc = await LevelUser.findOne({ guildId, userId });
  if (!doc) {
    doc = await LevelUser.create({ guildId, userId });
  }
  return doc;
}

/** يرسل رسالة الترقية للمستوى الجديد حسب إعدادات السيرفر */
async function announceLevelUp(
  member: GuildMember,
  newLevel: number,
  gConfig: IGuildConfig,
  fallbackChannel: GuildTextBasedChannel | null
): Promise<void> {
  const custom = gConfig.leveling.levelUpMessage;
  if (!custom?.enabled) return;

  let targetChannel: GuildTextBasedChannel | null = null;

  if (gConfig.leveling.announceInChannel) {
    if (gConfig.leveling.levelUpChannelId) {
      const ch = member.guild.channels.cache.get(gConfig.leveling.levelUpChannelId);
      if (ch?.isTextBased()) targetChannel = ch;
    }
  } else {
    targetChannel = fallbackChannel;
  }

  if (!targetChannel) return;

  const payload = buildMessageFromCustom(custom, {
    user: {
      id: member.id,
      username: member.user.username,
      tag: member.user.tag,
      mention: `<@${member.id}>`,
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

/**
 * ينفّذ منطق منح الخبرة المشترك: يضيف الخبرة، يحفظ المستند، ويتحقق من الترقية
 * (منح رتب المكافآت وإرسال رسالة الترقية) إن ارتفع المستوى.
 */
async function awardXp(
  member: GuildMember,
  doc: LiveDoc<ILevelUser>,
  amount: number,
  gConfig: IGuildConfig,
  fallbackChannel: GuildTextBasedChannel | null
): Promise<void> {
  const oldLevel = doc.level;

  doc.totalXp += amount;
  const info = levelFromTotalXp(doc.totalXp);
  doc.level = info.level;
  doc.xp = info.currentLevelXp;

  await doc.save();

  if (info.level > oldLevel) {
    await grantRoleRewards(member, info.level, gConfig);
    await announceLevelUp(member, info.level, gConfig, fallbackChannel);
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

/** يعالج منح الخبرة عند إرسال رسالة نصية (يُستدعى من messageCreate) */
export async function handleMessageXp(
  client: ExtendedClient,
  message: Message,
  gConfig: IGuildConfig
): Promise<void> {
  if (!gConfig.leveling.enabled) return;
  if (!message.guild || !message.member) return;
  if (isIgnored(gConfig, message.channelId, message.member)) return;

  const doc = await getOrCreateLevelUser(message.guild.id, message.author.id);

  const cooldownMs = (gConfig.leveling.messageCooldownSeconds ?? 60) * 1000;
  if (doc.lastMessageAt && Date.now() - doc.lastMessageAt.getTime() < cooldownMs) {
    return;
  }

  const { min, max } = gConfig.leveling.xpPerMessage;
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;

  doc.lastMessageAt = new Date();

  await awardXp(message.member, doc, amount, gConfig, message.channel as GuildTextBasedChannel);
}

/** يبدأ مهمة دورية كل دقيقة لمنح خبرة الأعضاء الموجودين في الرومات الصوتية */
export function startVoiceXpInterval(client: ExtendedClient): void {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const gConfig = await getGuildConfig(client, guild.id);
        if (!gConfig.leveling.enabled) continue;

        const voiceChannels = guild.channels.cache.filter(
          (c): c is VoiceChannel => c.type === ChannelType.GuildVoice
        );

        // ── جمع الأعضاء النشطين عبر كل الرومات الصوتية ──────────────────
        type ActiveMember = { member: GuildMember; channelId: string };
        const activeMembers: ActiveMember[] = [];

        for (const channel of voiceChannels.values()) {
          if (gConfig.leveling.ignoredChannelIds?.includes(channel.id)) continue;
          for (const member of channel.members.values()) {
            if (member.user.bot) continue;
            if (isIgnored(gConfig, channel.id, member)) continue;
            activeMembers.push({ member, channelId: channel.id });
          }
        }

        if (!activeMembers.length) continue;

        // ── جلب مستندات الخبرة دفعة واحدة (batch) بدلاً من N+1 ────────────
        const memberIds = activeMembers.map(({ member }) => member.id);
        const existingDocs = await LevelUser.find({ guildId: guild.id, userId: { $in: memberIds } });
        const docMap = new Map(existingDocs.map((d) => [d.userId, d]));

        // إنشاء المستندات المفقودة لمن لم يُسجَّل بعد
        const missingIds = memberIds.filter((id) => !docMap.has(id));
        for (const userId of missingIds) {
          const newDoc = await LevelUser.create({ guildId: guild.id, userId }).catch(() => null);
          if (newDoc) docMap.set(userId, newDoc);
        }

        // ── منح الخبرة لكل عضو ───────────────────────────────────────────
        for (const { member } of activeMembers) {
          const doc = docMap.get(member.id);
          if (!doc) continue;
          doc.voiceMinutes = (doc.voiceMinutes ?? 0) + 1;
          await awardXp(member, doc, gConfig.leveling.xpPerVoiceMinute, gConfig, null);
        }
      } catch (err) {
        logError("xp-voice", err);
      }
    }
  }, 60_000);
}

