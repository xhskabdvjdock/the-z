import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "banner",
  description: "Display a user's banner",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "user", description: "The target user", type: "user", required: false },
    { name: "server", description: "Use server banner instead of profile", type: "boolean", required: false }
  ],
  async run(ctx) {
    const targetMember = (await ctx.getMember("user")) ?? ctx.member;
    const useServerBanner = ctx.getBoolean("server") ?? false;
    
    if (!targetMember) {
      await ctx.reply({ content: "Could not find that user." });
      return;
    }
    
    let bannerUrl: string | null;
    let bannerType: string;

    if (useServerBanner) {
      // Try to get server banner
      bannerUrl = targetMember.guild.bannerURL({ size: 4096 });
      bannerType = "Server Banner";
    } else {
      // Get profile banner
      const fullUser = await ctx.client.users.fetch(targetMember.user.id, { force: true }).catch(() => null);
      bannerUrl = fullUser?.bannerURL({ size: 4096 }) ?? null;
      bannerType = "Profile Banner";
    }

    if (!bannerUrl) {
      await ctx.reply({ content: "This user does not have a banner." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`${targetMember.user.tag}'s ${bannerType}`)
      .setImage(bannerUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Download")
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
        new ButtonBuilder()
          .setLabel("Open in Browser")
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl)
      );

    await ctx.reply({ embeds: [embed], components: [row] });
  }
};

export default command;
