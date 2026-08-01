import { PermissionFlagsBits, TextChannel } from "discord.js";
import { Ticket } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { getGuildConfig } from "../../utils/guildConfig";

const command: BotCommand = {
  name: "ticket-remove",
  description: "إزالة عضو من التذكرة الحالية",
  category: "تذاكر",
  options: [
    {
      name: "user",
      description: "العضو المراد إزالته من التذكرة",
      type: "user",
      required: true
    }
  ],
  async run(ctx) {
    const channel = ctx.channel as TextChannel;
    const ticket = await Ticket.findOne({ channelId: channel.id });

    if (!ticket) {
      await ctx.reply("❌ هذا الأمر يعمل فقط داخل روم تذكرة.");
      return;
    }

    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);
    const category = gConfig.tickets.categories.find((c) => c.key === ticket.categoryKey);
    const isStaff =
      category?.staffRoleIds.some((roleId) => ctx.member.roles.cache.has(roleId)) ||
      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      await ctx.reply("❌ لا تملك صلاحية استخدام هذا الأمر.");
      return;
    }

    const user = await ctx.getUser("user");
    if (!user) {
      await ctx.reply("❌ يجب تحديد عضو صحيح.");
      return;
    }

    await channel.permissionOverwrites.delete(user.id).catch(() => {});

    ticket.addedUserIds = ticket.addedUserIds.filter((id: string) => id !== user.id);
    await ticket.save();

    await ctx.reply(`✅ تم إزالة <@${user.id}> من هذه التذكرة.`);
  }
};

export default command;
