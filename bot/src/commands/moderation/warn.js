import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Warning from '../../models/Warning.js';
import { createLog } from '../../systems/logging/logManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('تحذير عضو')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد تحذيره')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب التحذير')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const target = options.getUser('user');
    const reason = options.getString('reason');

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      // Create warning record
      const warning = new Warning({
        guildId: guild.id,
        userId: target.id,
        moderatorId: member.id,
        reason: reason,
      });
      await warning.save();

      // Get warning count
      const warningCount = await Warning.countDocuments({
        guildId: guild.id,
        userId: target.id,
        active: true,
      });

      // Log
      await createLog(guild.id, 'moderation', 'warn', {
        userId: target.id,
        moderatorId: member.id,
        reason: reason,
        warningCount: warningCount,
      }, interaction.client);

      // Try to DM user
      try {
        await target.send(`⚠️ تم تحذيرك في ${guild.name}\n**السبب:** ${reason}\n**عدد التحذيرات:** ${warningCount}`);
      } catch (error) {
        // User has DMs disabled
      }

      return interaction.reply({ 
        embeds: [successEmbed(
          `تم تحذير ${target.tag}\n**السبب:** ${reason}\n**عدد التحذيرات:** ${warningCount}`
        )] 
      });
    } catch (error) {
      console.error('Warn error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء تحذير العضو')], 
        ephemeral: true 
      });
    }
  },
};
