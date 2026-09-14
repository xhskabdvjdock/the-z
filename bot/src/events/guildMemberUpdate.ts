import { AuditLogEvent, EmbedBuilder, GuildMember } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildMemberUpdate",
  async execute(client, oldMember: GuildMember, newMember: GuildMember) {
    if (!newMember.guild) return;
    const changes: string[] = [];
    const before: any = {};
    const after: any = {};

    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`Nickname: \`${oldMember.nickname || "None"}\` -> \`${newMember.nickname || "None"}\``);
      before.nickname = oldMember.nickname;
      after.nickname = newMember.nickname;
    }
    if (oldMember.avatar !== newMember.avatar) {
      changes.push("Avatar changed");
      before.avatar = oldMember.avatar;
      after.avatar = newMember.avatar;
    }

    const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));
    if (addedRoles.size > 0) {
      changes.push(`Roles Added: ${addedRoles.map((r) => `${r.name} (\`${r.id}\`)`).join(", ")}`);
      before.rolesAdded = [];
      after.rolesAdded = [...addedRoles.keys()];
    }
    if (removedRoles.size > 0) {
      changes.push(`Roles Removed: ${removedRoles.map((r) => `${r.name} (\`${r.id}\`)`).join(", ")}`);
      before.rolesRemoved = [...removedRoles.keys()];
      after.rolesRemoved = [];
    }

    let timeoutBefore: string | null = null;
    let timeoutAfter: string | null = null;
    if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
      if (newMember.communicationDisabledUntil) {
        const duration = Math.floor((newMember.communicationDisabledUntilTimestamp! - Date.now()) / 1000 / 60);
        changes.push(`Timeout applied (${duration} minutes) until <t:${Math.floor(newMember.communicationDisabledUntilTimestamp! / 1000)}:F>`);
        timeoutAfter = newMember.communicationDisabledUntil.toISOString();
      } else {
        changes.push("Timeout removed");
        timeoutBefore = oldMember.communicationDisabledUntil?.toISOString() || null;
      }
      before.timeout = timeoutBefore;
      after.timeout = timeoutAfter;
    }

    if (changes.length === 0) return;

    let executor: any = null;
    try {
      const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === newMember.id && Date.now() - e.createdTimestamp < 10000);
      executor = entry?.executor || null;
    } catch {}

    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Member Updated")
      .addFields(
        { name: "User", value: `${newMember.user.tag} <@${newMember.id}> (\`${newMember.id}\`)`, inline: false },
        { name: "Updated By", value: executor ? `${executor.tag} <@${executor.id}>` : "Unknown / Self", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );
    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change.slice(0, 1024) });
    });
    embed.setFooter({ text: `User ID: ${newMember.id}` }).setTimestamp();

    await sendLog(client, newMember.guild.id, "members", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      targetId: newMember.id,
      targetTag: newMember.user.tag,
      before,
      after,
      details: { changes }
    });
  }
};

export default event;
