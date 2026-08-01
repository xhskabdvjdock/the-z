import { EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleRoleDelete as antiNukeRoleDelete } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "roleDelete",
  async execute(client, role: Role) {
    const gConfig = await getGuildConfig(client, role.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeRoleDelete(client, role, gConfig).catch(() => null);
    }

    await sendLog(
      client,
      role.guild.id,
      "roleUpdate",
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("➖ تم حذف رتبة")
        .setDescription(`\`${role.name}\``)
    );
  }
};

export default event;
