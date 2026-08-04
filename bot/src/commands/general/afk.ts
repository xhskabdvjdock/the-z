import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { AfkUser } from "@thez/shared";

const command: BotCommand = {
  name: "afk",
  description: "Set AFK status with a reason",
  category: "عام",
  guildOnly: true,
  options: [
    { name: "reason", description: "The reason for being AFK", type: "string", required: false }
  ],
  async run(ctx) {
    const reason = ctx.getString("reason") || "No reason provided";
    const guildId = ctx.guild.id;
    const userId = ctx.user.id;

    try {
      // Check if user is already AFK
      const existingAfk = await AfkUser.findOne({ guildId, userId });

      if (existingAfk && existingAfk.status) {
        // Remove AFK status
        await AfkUser.findOneAndUpdate(
          { guildId, userId },
          { $set: { status: false, mentionCount: 0 } }
        );

        const embed = new EmbedBuilder()
          .setColor(config.defaultColor)
          .setDescription("You are no longer AFK.");

        await ctx.reply({ embeds: [embed] });
        return;
      }

      // Set AFK status
      const afkData = {
        guildId,
        userId,
        status: true,
        reason,
        mentionCount: 0,
        since: new Date()
      };

      if (existingAfk) {
        await AfkUser.findOneAndUpdate({ guildId, userId }, { $set: afkData });
      } else {
        await AfkUser.create(afkData);
      }

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setDescription(`You are now AFK. Reason: ${reason}`);

      await ctx.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting AFK status:", error);
      await ctx.reply({ content: "Failed to set AFK status. Please try again." });
    }
  }
};

export default command;
