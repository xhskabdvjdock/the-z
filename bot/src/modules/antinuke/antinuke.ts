import { AuditLogEvent, EmbedBuilder, Guild, GuildBasedChannel, GuildMember, Role, User } from "discord.js";
import { IGuildConfig } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { logError } from "../../utils/logger";

type ActionType = "channelCreate" | "channelDelete" | "roleCreate" | "roleDelete" | "ban" | "kick";

/** يتتبّع طوابع زمن إجراءات كل فاعل في كل سيرفر (مفتاح: guildId:executorId:actionType) */
const actionTracker = new Map<string, number[]>();

/** فاعلون عوقبوا بالفعل داخل النافذة الحالية — منع تكرار العقوبة/إغراق السجل */
const punishmentTracker = new Map<string, number>();

const ACTION_LABELS: Record<ActionType, string> = {
  channelCreate: "إنشاء رومات بشكل مفرط",
  channelDelete: "حذف رومات بشكل مفرط",
  roleCreate: "إنشاء رتب بشكل مفرط",
  roleDelete: "حذف رتب بشكل مفرط",
  ban: "حظر أعضاء بشكل مفرط",
  kick: "طرد أعضاء بشكل مفرط"
};

const PUNISHMENT_LABELS: Record<string, string> = {
  stripRoles: "إزالة جميع الرتب",
  kick: "طرد من السيرفر",
  ban: "حظر من السيرفر"
};

/** يبحث في سجل التدقيق عن آخر إدخال يطابق الهدف خلال آخر 5 ثوانٍ، ويعيد آيدي الفاعل */
async function findExecutorId(
  guild: Guild,
  auditLogType: AuditLogEvent,
  targetId: string
): Promise<string | null> {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditLogType, limit: 5 });
    const entry = logs.entries.find(
      (e) => (e.target as { id?: string } | null)?.id === targetId &&
        Date.now() - e.createdTimestamp < 5000
    );
    return entry?.executor?.id ?? null;
  } catch {
    return null;
  }
}

function isWhitelisted(
  guild: Guild,
  executorId: string,
  client: ExtendedClient,
  gConfig: IGuildConfig
): boolean {
  if (executorId === guild.ownerId) return true;
  if (client.user && executorId === client.user.id) return true;
  if (gConfig.antiNuke.whitelistUserIds?.includes(executorId)) return true;
  return false;
}

function getLimit(actionType: ActionType, gConfig: IGuildConfig): number {
  switch (actionType) {
    case "channelCreate":
      return gConfig.antiNuke.maxChannelCreates;
    case "channelDelete":
      return gConfig.antiNuke.maxChannelDeletes;
    case "roleCreate":
      return gConfig.antiNuke.maxRoleCreates;
    case "roleDelete":
      return gConfig.antiNuke.maxRoleDeletes;
    case "ban":
      return gConfig.antiNuke.maxBans;
    case "kick":
      return gConfig.antiNuke.maxKicks;
  }
}

/** يسجّل إجراءً جديداً للفاعل ويعيد true إذا تجاوز عدد إجراءاته النافذة الزمنية المسموحة */
function registerActionAndCheck(
  guild: Guild,
  executorId: string,
  actionType: ActionType,
  gConfig: IGuildConfig
): boolean {
  const key = `${guild.id}:${executorId}:${actionType}`;
  const now = Date.now();
  const windowMs = gConfig.antiNuke.timeWindowSeconds * 1000;
  const timestamps = (actionTracker.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  // حماية الذاكرة: نحتفظ بآخر 64 طابعًا فقط لكل مفتاح، ونحذف المفتاح فارغه بالكامل
  const slim = timestamps.slice(-64);
  if (slim.length > 0) actionTracker.set(key, slim);
  else actionTracker.delete(key);

  // تنظيف دوري: مفاتيح توقفت عن النشاط تُحذف، ومنع نمو المفتاحين بلا حدود
  if (actionTracker.size % 512 === 0) {
    const cutoff = now - windowMs * 2;
    for (const [k, arr] of actionTracker) {
      const last = arr[arr.length - 1];
      if (last === undefined || last < cutoff) actionTracker.delete(k);
    }
    for (const [k, ts] of punishmentTracker) {
      if (ts < cutoff) punishmentTracker.delete(k);
    }
  }

  return slim.length > getLimit(actionType, gConfig);
}

async function sendAntiNukeLog(
  client: ExtendedClient,
  guild: Guild,
  executorId: string,
  actionType: ActionType,
  punishmentLabel: string,
  gConfig: IGuildConfig
) {
  if (!gConfig.antiNuke.logChannelId) return;

  const channel = await client.channels.fetch(gConfig.antiNuke.logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🚨 تم رصد نشاط مشبوه (مكافحة الغزو)")
    .addFields(
      { name: "الفاعل", value: `<@${executorId}> (\`${executorId}\`)` },
      { name: "نوع المخالفة", value: ACTION_LABELS[actionType] },
      { name: "العقوبة المطبقة", value: punishmentLabel }
    )
    .setTimestamp();

  await (channel as any).send({ embeds: [embed] }).catch(() => null);
}

async function punishExecutor(
  client: ExtendedClient,
  guild: Guild,
  executorId: string,
  actionType: ActionType,
  gConfig: IGuildConfig
) {
  const punishment = gConfig.antiNuke.punishment;
  const reason = `مكافحة الغزو: تجاوز الحد المسموح (${ACTION_LABELS[actionType]})`;
  let punishmentLabel = PUNISHMENT_LABELS[punishment] ?? punishment;

  try {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (member) {
      switch (punishment) {
        case "stripRoles": {
          const rolesToRemove = member.roles.cache.filter((r) => r.id !== guild.id);
          await member.roles.remove(rolesToRemove).catch(() => null);
          break;
        }
        case "kick":
          await member.kick(reason).catch(() => null);
          break;
        case "ban":
          await member.ban({ reason }).catch(() => null);
          break;
      }
    }
  } catch (err) {
    logError("antinuke-punishment", err);
  }

  await sendAntiNukeLog(client, guild, executorId, actionType, punishmentLabel, gConfig);
}

async function processEvent(
  client: ExtendedClient,
  guild: Guild,
  targetId: string,
  auditLogType: AuditLogEvent,
  actionType: ActionType,
  gConfig: IGuildConfig
) {
  if (!gConfig.antiNuke?.enabled) return;

  const executorId = await findExecutorId(guild, auditLogType, targetId);
  if (!executorId) return;
  if (isWhitelisted(guild, executorId, client, gConfig)) return;

  // عقوبة نافذة واحدة فقط لكل فاعل/نوع — لا نكرر الضرب كل رسالة أثناء نفس النافذة
  const key = `${guild.id}:${executorId}:${actionType}`;
  const punishedAt = punishmentTracker.get(key);
  if (punishedAt != null && Date.now() - punishedAt < gConfig.antiNuke.timeWindowSeconds * 1000) {
    return;
  }

  const exceeded = registerActionAndCheck(guild, executorId, actionType, gConfig);
  if (exceeded) {
    punishmentTracker.set(key, Date.now());
    await punishExecutor(client, guild, executorId, actionType, gConfig);
  }
}

export async function handleChannelCreate(
  client: ExtendedClient,
  channel: GuildBasedChannel,
  gConfig: IGuildConfig
): Promise<void> {
  await processEvent(client, channel.guild, channel.id, AuditLogEvent.ChannelCreate, "channelCreate", gConfig);
}

export async function handleChannelDelete(
  client: ExtendedClient,
  channel: GuildBasedChannel,
  gConfig: IGuildConfig
): Promise<void> {
  await processEvent(client, channel.guild, channel.id, AuditLogEvent.ChannelDelete, "channelDelete", gConfig);
}

export async function handleRoleCreate(
  client: ExtendedClient,
  role: Role,
  gConfig: IGuildConfig
): Promise<void> {
  await processEvent(client, role.guild, role.id, AuditLogEvent.RoleCreate, "roleCreate", gConfig);
}

export async function handleRoleDelete(
  client: ExtendedClient,
  role: Role,
  gConfig: IGuildConfig
): Promise<void> {
  await processEvent(client, role.guild, role.id, AuditLogEvent.RoleDelete, "roleDelete", gConfig);
}

export async function handleBanAdd(
  client: ExtendedClient,
  guild: Guild,
  user: User,
  gConfig: IGuildConfig
): Promise<void> {
  await processEvent(client, guild, user.id, AuditLogEvent.MemberBanAdd, "ban", gConfig);
}

/** يكتشف حالة الطرد (Kick) فقط عبر سجل التدقيق، إذ لا يوجد حدث Discord مخصص للطرد */
export async function handleMemberRemove(
  client: ExtendedClient,
  member: GuildMember,
  gConfig: IGuildConfig
): Promise<void> {
  if (!gConfig.antiNuke?.enabled) return;

  const executorId = await findExecutorId(member.guild, AuditLogEvent.MemberKick, member.id);
  if (!executorId) return;
  if (isWhitelisted(member.guild, executorId, client, gConfig)) return;

  const key = `${member.guild.id}:${executorId}:kick`;
  const punishedAt = punishmentTracker.get(key);
  if (punishedAt != null && Date.now() - punishedAt < gConfig.antiNuke.timeWindowSeconds * 1000) {
    return;
  }

  const exceeded = registerActionAndCheck(member.guild, executorId, "kick", gConfig);
  if (exceeded) {
    punishmentTracker.set(key, Date.now());
    await punishExecutor(client, member.guild, executorId, "kick", gConfig);
  }
}
