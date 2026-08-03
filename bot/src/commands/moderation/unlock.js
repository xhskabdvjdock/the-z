import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Guild from '../../models/Guild.js';
import { createLog } from '../../systems/logging/logManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('فتح القناة')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('القناة المراد فتحها (افتراضي: القناة الحالية)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const { guild, member, channel, options } = interaction;
    const targetChannel = options.getChannel('channel') || channel;

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null,
      });

      // Remove from database
      const guildData = await Guild.findOne({ guildId: guild.id });
      if (guildData) {
        guildData.lockedChannels = guildData.lockedChannels.filter(
          id => id !== targetChannel.id
        );
        await guildData.save();
      }

      // Log
      await createLog(guild.id, 'moderation', 'unlock', {
        channelId: targetChannel.id,
        moderatorId: member.id,
      }, interaction.client);

      return interaction.reply({ 
        embeds: [successEmbed(`تم فتح ${targetChannel} بنجاح`)] 
      });
    } catch (error) {
      console.error('Unlock error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء فتح القناة')], 
        ephemeral: true 
      });
    }
  },
};
