import { EmbedBuilder, Guild } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildUpdate",
  async execute(client, oldGuild: Guild, newGuild: Guild) {
    const changes: string[] = [];

    // Name change
    if (oldGuild.name !== newGuild.name) {
      changes.push(`Name: ${oldGuild.name} → ${newGuild.name}`);
    }

    // Icon change
    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`Icon: ${oldGuild.icon ? "Changed" : "None"} → ${newGuild.icon ? "Changed" : "None"}`);
    }

    // Banner change
    if (oldGuild.banner !== newGuild.banner) {
      changes.push(`Banner: ${oldGuild.banner ? "Changed" : "None"} → ${newGuild.banner ? "Changed" : "None"}`);
    }

    // Description change
    if (oldGuild.description !== newGuild.description) {
      changes.push(`Description: ${oldGuild.description || "None"} → ${newGuild.description || "None"}`);
    }

    // Verification level change
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      changes.push(`Verification Level: ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
    }

    // MFA level change
    if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
      changes.push(`MFA Level: ${oldGuild.mfaLevel} → ${newGuild.mfaLevel}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Server Updated")
      .addFields(
        { name: "Server", value: `${newGuild.name} (${newGuild.id})`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `Server ID: ${newGuild.id}` });
    embed.setTimestamp();

    await sendLog(client, newGuild.id, "server", embed);
  }
};

export default event;
