import { PermissionFlagsBits, TextChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { getGuildConfig } from "../../utils/guildConfig";
import { sendSelfRolePanel } from "../../modules/roles/selfRoles";

const command: BotCommand = {
  name: "selfrole-panel",
  description: "إرسال لوحة رتب ذاتية معيّنة في هذه القناة",
  category: "رولات",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  guildOnly: true,
  options: [
    {
      name: "panel_id",
      description: "معرّف اللوحة (id) كما هو محدد في الإعدادات",
      type: "string",
      required: true
    }
  ],
  async run(ctx) {
    const panelId = ctx.getString("panel_id");
    if (!panelId) {
      await ctx.reply({ content: "❌ يجب تحديد معرّف اللوحة." });
      return;
    }

    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);
    const panel = gConfig.selfRoles?.find((p) => p.id === panelId);

    if (!panel) {
      await ctx.reply({ content: `❌ لا توجد لوحة رتب ذاتية بالمعرّف \`${panelId}\`.` });
      return;
    }

    await sendSelfRolePanel(ctx.channel as TextChannel, panel, ctx.guild.id);
    await ctx.reply({ content: "✅ تم إرسال لوحة الرتب الذاتية في هذه القناة." });
  }
};

export default command;
