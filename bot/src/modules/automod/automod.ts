import { EmbedBuilder, GuildMember, Message, PermissionsBitField } from "discord.js";
import { IGuildConfig, Warning } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { sendLog } from "../logging/logger";

const INVITE_REGEX = /(discord\.gg\/|discord(?:app)?\.com\/invite\/)[a-z0-9-]+/i;
const LINK_REGEX = /https?:\/\/\S+/i;

/** يتتبّع طوابع زمن رسائل كل عضو في كل سيرفر لغرض كشف السبام (مفتاح: guildId:userId) */
const spamTracker = new Map<string, number[]>();

type ViolationType =
  | "antiInvite"
  | "antiLink"
  | "badWords"
  | "antiCaps"
  | "antiRepeat"
  | "antiMention"
  | "antiSpam";

const VIOLATION_LABELS: Record<ViolationType, string> = {
  antiInvite: "نشر رابط دعوة ديسكورد",
  antiLink: "نشر رابط خارجي",
  badWords: "استخدام كلمة محظورة",
  antiCaps: "الإفراط في استخدام الأحرف الكبيرة",
  antiRepeat: "تكرار الأحرف بشكل مفرط",
  antiMention: "الإفراط في المنشنات",
  antiSpam: "إرسال رسائل متكررة بسرعة (سبام)"
};

const PUNISHMENT_LABELS: Record<string, string> = {
  delete: "حذف الرسالة فقط",
  warn: "تحذير",
  mute: "كتم مؤقت",
  kick: "طرد",
  ban: "حظر"
};

/**
 * يفحص رسالة العضو حسب إعدادات الرقابة التلقائية للسيرفر، ويطبّق العقوبة المناسبة عند المخالفة.
 * يعيد true إن تمت معالجة الرسالة (حذف/عقوبة)، وعندها يجب على المستدعي التوقف عن أي معالجة إضافية.
 */
export async function handleAutoMod(
  client: ExtendedClient,
  message: Message,
  gConfig: IGuildConfig
): Promise<boolean> {
  if (!gConfig.automod?.enabled) return false;
  if (!message.guild) return false;

  const member =
    message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return false;

  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return false;

  const automod = gConfig.automod;

  if (
    automod.whitelistRoleIds?.length &&
    member.roles.cache.hasAny(...automod.whitelistRoleIds)
  ) {
    return false;
  }

  if (automod.whitelistChannelIds?.includes(message.channelId)) {
    return false;
  }

  const content = message.content ?? "";
  let violation: ViolationType | null = null;

  if (automod.antiInvite && INVITE_REGEX.test(content)) {
    violation = "antiInvite";
  }

  if (!violation && automod.antiLink && LINK_REGEX.test(content)) {
    violation = "antiLink";
  }

  if (!violation && automod.badWords?.length) {
    const tokens = content.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const matched = automod.badWords.some((word) => {
      const normalized = word?.trim().toLowerCase();
      return normalized && tokens.includes(normalized);
    });
    if (matched) violation = "badWords";
  }

  if (!violation && automod.antiCaps?.enabled && content.length >= automod.antiCaps.minLength) {
    const letters = content.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 0) {
      const upperCount = (content.match(/[A-Z]/g) ?? []).length;
      const percent = (upperCount / letters.length) * 100;
      if (percent >= automod.antiCaps.percentThreshold) {
        violation = "antiCaps";
      }
    }
  }

  if (!violation && automod.antiRepeat?.enabled) {
    const repeatRegex = new RegExp(`(.)\\1{${automod.antiRepeat.maxRepeats},}`, "iu");
    if (repeatRegex.test(content)) {
      violation = "antiRepeat";
    }
  }

  if (!violation && automod.antiMention?.enabled) {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount > automod.antiMention.maxMentions) {
      violation = "antiMention";
    }
  }

  if (!violation && automod.antiSpam?.enabled) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const windowMs = automod.antiSpam.perSeconds * 1000;
    const timestamps = (spamTracker.get(key) ?? []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    spamTracker.set(key, timestamps);

    if (timestamps.length > automod.antiSpam.maxMessages) {
      violation = "antiSpam";
    }
  }

  if (!violation) return false;

  await message.delete().catch(() => null);
  await applyPunishment(client, member, automod.punishment, VIOLATION_LABELS[violation], automod.muteRoleId);

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🛡️ رقابة تلقائية")
    .setDescription(
      `تم اتخاذ إجراء بحق ${member} في ${message.channel}\n` +
        `**السبب:** ${VIOLATION_LABELS[violation]}\n` +
        `**العقوبة:** ${PUNISHMENT_LABELS[automod.punishment] ?? automod.punishment}`
    )
    .addFields({ name: "محتوى الرسالة", value: content.slice(0, 1000) || "—" })
    .setFooter({ text: `${message.author.tag} (${message.author.id})` });

  await sendLog(client, message.guild.id, "moderation", embed);

  return true;
}

async function applyPunishment(
  client: ExtendedClient,
  member: GuildMember,
  punishment: IGuildConfig["automod"]["punishment"],
  reasonLabel: string,
  muteRoleId?: string
) {
  const reason = `مخالفة رقابة تلقائية: ${reasonLabel}`;

  try {
    switch (punishment) {
      case "delete":
        break;

      case "warn":
        await Warning.create({
          guildId: member.guild.id,
          userId: member.id,
          moderatorId: client.user?.id ?? "AutoMod",
          reason
        });
        break;

      case "mute": {
        const muteRole = muteRoleId ? member.guild.roles.cache.get(muteRoleId) : null;
        if (muteRole) {
          await member.roles.add(muteRole).catch(() => null);
        } else {
          await member.timeout(10 * 60 * 1000, reason).catch(() => null);
        }
        break;
      }

      case "kick":
        await member.kick(reason).catch(() => null);
        break;

      case "ban":
        await member.ban({ reason }).catch(() => null);
        break;
    }
  } catch (err) {
    console.error("خطأ أثناء تطبيق عقوبة الرقابة التلقائية:", err);
  }
}
