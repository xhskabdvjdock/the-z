import { EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleRoleCreate as antiNukeRoleCreate } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "roleCreate",
  async execute(client, role: Role) {
    const gConfig = await getGuildConfig(client, role.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeRoleCreate(client, role, gConfig).catch(() => null);
    }

    await sendLog(
      client,
      role.guild.id,
      "roles",
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("➕ تم إنشاء رتبة جديدة")
        .setDescription(`${role} (\`${role.name}\`)`)
    );
  }
};

export default event;
