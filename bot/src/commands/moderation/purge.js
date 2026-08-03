import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import { createLog } from '../../systems/logging/logManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('حذف رسائل من القناة')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('عدد الرسائل المراد حذفها (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('حذف رسائل عضو محدد فقط')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const { channel, guild, member, options } = interaction;
    const amount = options.getInteger('amount');
    const targetUser = options.getUser('user');

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      await interaction.deferReply({ ephemeral: true });

      let deleted = 0;
      let lastId;

      while (deleted < amount) {
        const options = { limit: Math.min(100, amount - deleted) };
        if (lastId) {
          options.before = lastId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        const toDelete = targetUser
          ? messages.filter(m => m.author.id === targetUser.id)
          : messages;

        if (toDelete.size > 0) {
          await channel.bulkDelete(Array.from(toDelete.keys()), true);
          deleted += toDelete.size;
        }

        lastId = messages.last().id;
        if (messages.size < 100) break;
      }

      // Log
      await createLog(guild.id, 'moderation', 'purge', {
        channelId: channel.id,
        amount: deleted,
        moderatorId: member.id,
        targetUserId: targetUser?.id,
      }, interaction.client);

      return interaction.editReply({ 
        embeds: [successEmbed(`تم حذف ${deleted} رسالة بنجاح`)] 
      });
    } catch (error) {
      console.error('Purge error:', error);
      return interaction.editReply({ 
        embeds: [errorEmbed('حدث خطأ أثناء حذف الرسائل')] 
      });
    }
  },
};
