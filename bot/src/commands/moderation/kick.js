import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Warning from '../../models/Warning.js';
import { createLog } from '../../systems/logging/logManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد طرده')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب الطرد')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const target = options.getUser('user');
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
          embeds: [errorEmbed('لا يمكنك طرد هذا العضو')], 
          ephemeral: true 
        });
      }

      await targetMember.kick(`${reason} - بواسطة ${member.user.tag}`);

      // Create warning record
      const warning = new Warning({
        guildId: guild.id,
        userId: target.id,
        moderatorId: member.id,
        reason: `Kick: ${reason}`,
      });
      await warning.save();

      // Log
      await createLog(guild.id, 'moderation', 'kick', {
        userId: target.id,
        moderatorId: member.id,
        reason: reason,
      }, interaction.client);

      return interaction.reply({ 
        embeds: [successEmbed(`تم طرد ${target.tag} بنجاح\n**السبب:** ${reason}`)] 
      });
    } catch (error) {
      console.error('Kick error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء طرد العضو')], 
        ephemeral: true 
      });
    }
  },
};
