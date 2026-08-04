import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "avatar",
  description: "Display a user's avatar",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "user", description: "The target user", type: "user", required: false },
    { name: "server", description: "Use server avatar instead of global", type: "boolean", required: false }
  ],
  async run(ctx) {
    const targetMember = (await ctx.getMember("user")) ?? ctx.member;
    const useServerAvatar = ctx.getBoolean("server") ?? false;
    
    let avatarUrl: string;
    let avatarType: string;

    if (useServerAvatar && targetMember.avatar) {
      avatarUrl = targetMember.avatarURL({ size: 4096 }) || targetMember.user.displayAvatarURL({ size: 4096 });
      avatarType = "Server Avatar";
    } else {
      avatarUrl = targetMember.user.displayAvatarURL({ size: 4096 });
      avatarType = "Global Avatar";
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`${targetMember.user.tag}'s ${avatarType}`)
      .setImage(avatarUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Download")
          .setStyle(ButtonStyle.Link)
          .setURL(avatarUrl),
        new ButtonBuilder()
          .setLabel("Open in Browser")
          .setStyle(ButtonStyle.Link)
          .setURL(avatarUrl)
      );

    await ctx.reply({ embeds: [embed], components: [row] });
  }
};

export default command;
