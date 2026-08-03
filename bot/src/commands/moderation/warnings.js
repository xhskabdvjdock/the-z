import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Warning from '../../models/Warning.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('عرض تحذيرات عضو')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد عرض تحذيراته')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const { guild, options } = interaction;
    const target = options.getUser('user');

    try {
      if (!isModerator(interaction.member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية لاستخدام هذا الأمر')], 
          ephemeral: true 
        });
      }

      const warnings = await Warning.find({
        guildId: guild.id,
        userId: target.id,
        active: true,
      }).sort({ timestamp: -1 });

      if (warnings.length === 0) {
        return interaction.reply({ 
          embeds: [new EmbedBuilder()
            .setTitle('📋 التحذيرات')
            .setDescription(`${target.tag} ليس لديه أي تحذيرات`)
            .setColor('#5865F2')
          ], 
          ephemeral: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 تحذيرات ${target.tag}`)
        .setDescription(`**إجمالي التحذيرات:** ${warnings.length}`)
        .setColor('#FEE75C')
        .setThumbnail(target.displayAvatarURL());

      const warningsList = warnings.slice(0, 10).map((warn, index) => {
        const date = new Date(warn.timestamp).toLocaleDateString('ar-SA');
        return `\`${index + 1}.\` ${warn.reason} - ${date}`;
      }).join('\n');

      embed.addFields({ name: 'التحذيرات', value: warningsList });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Warnings error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء جلب التحذيرات')], 
        ephemeral: true 
      });
    }
  },
};
