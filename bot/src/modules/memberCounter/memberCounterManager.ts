import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { logError } from "../../utils/logger";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const PRESENCE_THROTTLE_MS = 5 * 60 * 1000;

/** قفل لكل سيرفر لمنع تداخل التحديثات المتزامنة */
const pending = new Set<string>();
const lastPresenceUpdate = new Map<string, number>();

/**
 * يعيد تسمية الروم الصوتي المُحدد باسم سيرفر جديد حسب قالب memberCounter.format
 * ({count} = عدد الأعضاء، {online} = عدد المتصلين).
 */
export async function updateMemberCounter(client: ExtendedClient, guildId: string): Promise<void> {
  if (pending.has(guildId)) return;
  pending.add(guildId);
  try {
    const gConfig = await getGuildConfig(client, guildId);
    if (!gConfig.memberCounter?.enabled || !gConfig.memberCounter.channelId) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    let channel = guild.channels.cache.get(gConfig.memberCounter.channelId);
    if (!channel) channel = (await guild.channels.fetch(gConfig.memberCounter.channelId).catch(() => null)) ?? undefined;
    if (!channel || !channel.isVoiceBased()) return;

    const online = guild.members.cache.filter((m) => m.presence?.status === "online").size;
    const name = (gConfig.memberCounter.format || "الأعضاء: {count}")
      .replace("{count}", String(guild.memberCount))
      .replace("{online}", String(online))
      .slice(0, 100)
      .trim();

    if (channel.name !== name) await channel.setName(name).catch(() => null);
  } catch (err) {
    logError("member-counter", err);
  } finally {
    pending.delete(guildId);
  }
}

/** تشغيل العداد: حلقة دورية + تحديث فوري عند دخول/خروج عضو + تحديث محدود عند تغيّر الحضور */
export function startMemberCounter(client: ExtendedClient): void {
  const runAll = () => {
    for (const guild of client.guilds.cache.values()) updateMemberCounter(client, guild.id);
  };

  runAll();
  setInterval(runAll, CHECK_INTERVAL_MS);

  client.on("guildMemberAdd", (member) => updateMemberCounter(client, member.guild.id));
  client.on("guildMemberRemove", (member) => updateMemberCounter(client, member.guild.id));

  client.on("presenceUpdate", (_old, presence) => {
    if (!presence?.guild) return;
    const now = Date.now();
    const last = lastPresenceUpdate.get(presence.guild.id) ?? 0;
    if (now - last < PRESENCE_THROTTLE_MS) return;
    lastPresenceUpdate.set(presence.guild.id, now);
    updateMemberCounter(client, presence.guild.id);
  });
}