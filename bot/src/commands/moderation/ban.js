import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Warning from '../../models/Warning.js';
import { createLog } from '../../systems/logging/logManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد حظره')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب الحظر')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('عدد الأيام لحذف الرسائل (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const target = options.getUser('user');
    const reason = options.getString('reason') || 'لا يوجد سبب';
    const days = options.getInteger('days') || 0;

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      const targetMember = await guild.members.fetch(target.id).catch(() => null);
      
      if (targetMember) {
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
          return interaction.reply({ 
            embeds: [errorEmbed('لا يمكنك حظر هذا العضو')], 
            ephemeral: true 
          });
        }
      }

      await guild.members.ban(target.id, { 
        reason: `${reason} - بواسطة ${member.user.tag}`,
        deleteMessageDays: days,
      });

      // Create warning record
      const warning = new Warning({
        guildId: guild.id,
        userId: target.id,
        moderatorId: member.id,
        reason: `Ban: ${reason}`,
      });
      await warning.save();

      // Log
      await createLog(guild.id, 'moderation', 'ban', {
        userId: target.id,
        moderatorId: member.id,
        reason: reason,
        days: days,
      }, interaction.client);

      return interaction.reply({ 
        embeds: [successEmbed(`تم حظر ${target.tag} بنجاح\n**السبب:** ${reason}`)] 
      });
    } catch (error) {
      console.error('Ban error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء حظر العضو')], 
        ephemeral: true 
      });
    }
  },
};
