import { PermissionFlagsBits, TextChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { getGuildConfig } from "../../utils/guildConfig";
import { sendColorPanel } from "../../modules/roles/colorRoles";

const command: BotCommand = {
  name: "colors-panel",
  description: "إرسال لوحة اختيار ألوان الأسماء في هذه القناة",
  category: "رولات",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  guildOnly: true,
  async run(ctx) {
    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);

    if (!gConfig.colors?.roles?.length) {
      await ctx.reply({ content: "❌ لا توجد ألوان معرّفة بعد، أضِفها من لوحة التحكم أولاً." });
      return;
    }

    await sendColorPanel(ctx.channel as TextChannel, gConfig);
    await ctx.reply({ content: "✅ تم إرسال لوحة الألوان في هذه القناة." });
  }
};

export default command;
