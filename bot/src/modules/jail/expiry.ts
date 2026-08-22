import { Guild, GuildMember } from "discord.js";
import { JailUser, LiveDoc, IGuildConfig } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { logError } from "../../utils/logger";
import { recordModerationLog } from "../moderation/auditLog";

/** يعيد رتب العضو المحفوظة ويفك رتبة الج — منطق موحّد للفك اليدوي والآلي */
export async function releaseJailedMember(
  guild: Guild,
  gConfig: IGuildConfig,
  jailRecord: LiveDoc<{ userId: string; originalRoles: string[] }>,
  member: GuildMember
): Promise<void> {
  const jailRole = gConfig.jail?.enabled && gConfig.jail.roleId
    ? guild.roles.cache.get(gConfig.jail.roleId)
    : null;

  if (jailRole) await member.roles.remove(jailRole).catch(() => null);

  const rolesToRestore = (jailRecord.originalRoles ?? []).flatMap((id) => {
    const role = guild.roles.cache.get(id);
    return role ? [role] : [];
  });

  if (rolesToRestore.length > 0) {
    await member.roles.add(rolesToRestore).catch(() => null);
  }
}

/** يفحص كل فترة السياقات المنتهية ويفك السجن تلقائياً — نفس سلوك ,unjail */
export function startJailExpiryInterval(client: ExtendedClient): void {
  setInterval(async () => {
    try {
      const now = Date.now();
      const withDeadline = await JailUser.find({ jailedUntil: { $ne: null } });

      for (const record of withDeadline) {
        const until = record.jailedUntil ? new Date(record.jailedUntil).getTime() : Infinity;
        if (until > now) continue;

        const guild = client.guilds.cache.get(record.guildId);
        if (guild) {
          try {
            const gConfig = await getGuildConfig(client, guild.id);
            const member = await guild.members.fetch(record.userId).catch(() => null);
            if (member) {
              await releaseJailedMember(guild, gConfig, record, member);
            }
          } catch (err) {
            logError("jail-expiry-member", err);
          }
        }

        // السجل انتهى — نظيفة حتى لو لم يوجد السيرفر/العضو (لا نعيده عند العودة)
        await JailUser.deleteOne({ guildId: record.guildId, userId: record.userId }).catch(
          () => null
        );

        await recordModerationLog({
          guildId: record.guildId,
          userId: record.userId,
          moderatorId: "AutoExpiry",
          action: "unjail",
          reason: "انتهاء مدة السجن تلقائياً"
        });
      }
    } catch (err) {
      logError("jail-expiry-scan", err);
    }
  }, 60_000);
}