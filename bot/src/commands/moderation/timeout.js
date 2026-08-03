import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Warning from '../../models/Warning.js';
import { createLog } from '../../systems/logging/logManager.js';
import ms from 'ms';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('ميوت عضو (Timeout)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد ميوتة')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('مدة الميوت (مثال: 1h, 30m, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب الميوت')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const target = options.getUser('user');
    const duration = options.getString('duration');
    const reason = options.getString('reason') || 'لا يوجد سبب';

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      const targetMember = await guild.members.fetch(target.id);
      
      if (targetMember.roles.highest.position >= member.roles.highest.position) {
        return interaction.reply({ 
          embeds: [errorEmbed('لا يمكنك ميوت هذا العضو')], 
          ephemeral: true 
        });
      }

      const durationMs = ms(duration);
      if (!durationMs || durationMs < 1000) {
        return interaction.reply({ 
          embeds: [errorEmbed('مدة غير صحيحة. استخدم صيغة مثل: 1h, 30m, 1d')], 
          ephemeral: true 
        });
      }

      const timeoutUntil = new Date(Date.now() + durationMs);
      await targetMember.timeout(timeoutUntil, `${reason} - بواسطة ${member.user.tag}`);

      // Create warning record
      const warning = new Warning({
        guildId: guild.id,
        userId: target.id,
        moderatorId: member.id,
        reason: `Timeout: ${reason}`,
        expiresAt: timeoutUntil,
      });
      await warning.save();

      // Log
      await createLog(guild.id, 'moderation', 'timeout', {
        userId: target.id,
        moderatorId: member.id,
        reason: reason,
        duration: duration,
        expiresAt: timeoutUntil,
      }, interaction.client);

      return interaction.reply({ 
        embeds: [successEmbed(
          `تم ميوت ${target.tag} لمدة ${duration}\n**السبب:** ${reason}`
        )] 
      });
    } catch (error) {
      console.error('Timeout error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء ميوت العضو')], 
        ephemeral: true 
      });
    }
  },
};
