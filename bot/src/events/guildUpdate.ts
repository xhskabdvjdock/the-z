import { AuditLogEvent, EmbedBuilder, Guild } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildUpdate",
  async execute(client, oldGuild: Guild, newGuild: Guild) {
    const changes: string[] = [];
    const before: any = {};
    const after: any = {};

    if (oldGuild.name !== newGuild.name) {
      changes.push(`Name: \`${oldGuild.name}\` -> \`${newGuild.name}\``);
      before.name = oldGuild.name;
      after.name = newGuild.name;
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`Icon changed`);
      before.icon = oldGuild.icon;
      after.icon = newGuild.icon;
    }
    if (oldGuild.banner !== newGuild.banner) {
      changes.push(`Banner changed`);
      before.banner = oldGuild.banner;
      after.banner = newGuild.banner;
    }
    if (oldGuild.description !== newGuild.description) {
      changes.push(`Description: ${oldGuild.description || "None"} -> ${newGuild.description || "None"}`);
      before.description = oldGuild.description;
      after.description = newGuild.description;
    }
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      changes.push(`Verification Level: ${oldGuild.verificationLevel} -> ${newGuild.verificationLevel}`);
      before.verificationLevel = oldGuild.verificationLevel;
      after.verificationLevel = newGuild.verificationLevel;
    }
    if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
      changes.push(`MFA Level: ${oldGuild.mfaLevel} -> ${newGuild.mfaLevel}`);
      before.mfaLevel = oldGuild.mfaLevel;
      after.mfaLevel = newGuild.mfaLevel;
    }

    if (changes.length === 0) return;

    let executor: any = null;
    try {
      const audit = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 5 });
      executor = audit.entries.find((e) => Date.now() - e.createdTimestamp < 10000)?.executor || null;
    } catch {}

    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Server Updated")
      .addFields(
        { name: "Server", value: `${newGuild.name} (\`${newGuild.id}\`)`, inline: false },
        { name: "Updated By", value: executor ? `${executor.tag} <@${executor.id}>` : "Unknown", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );
    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change.slice(0, 1024) });
    });
    embed.setFooter({ text: `Server ID: ${newGuild.id}` }).setTimestamp();

    await sendLog(client, newGuild.id, "server", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      before,
      after,
      details: { changes }
    });
  }
};

export default event;
