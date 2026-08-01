import { ChannelType, EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

const command: BotCommand = {
  name: "serverinfo",
  description: "عرض معلومات السيرفر",
  category: "عام",
  guildOnly: true,
  async run(ctx) {
    const guild = ctx.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`📊 معلومات سيرفر ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 512 }))
      .addFields(
        { name: "اسم السيرفر", value: guild.name, inline: true },
        { name: "آيدي السيرفر", value: guild.id, inline: true },
        { name: "المالك", value: owner ? `${owner.user.tag}` : "غير معروف", inline: true },
        {
          name: "تاريخ الإنشاء",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: true
        },
        { name: "عدد الأعضاء", value: `${guild.memberCount}`, inline: true },
        {
          name: "عدد الرومات",
          value: `📝 ${textChannels} نصية / 🔊 ${voiceChannels} صوتية`,
          inline: true
        },
        { name: "عدد الرتب", value: `${guild.roles.cache.size}`, inline: true },
        { name: "مستوى البوست", value: `المستوى ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} بوست)`, inline: true }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
