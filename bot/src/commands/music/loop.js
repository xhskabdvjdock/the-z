import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('تفعيل/إلغاء تكرار الموسيقى')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('نوع التكرار')
                .setRequired(false)
                .addChoices(
                    { name: 'إيقاف', value: 'off' },
                    { name: 'أغنية واحدة', value: 'track' },
                    { name: 'القائمة', value: 'queue' }
                )
        ),

    async execute(interaction) {
        const { guild, member } = interaction;
        const mode = interaction.options.getString('mode') || 'track';

        try {
            if (!member.voice.channel) {
                return interaction.reply({
                    embeds: [errorEmbed('يجب أن تكون في روم صوتي')],
                    ephemeral: true
                });
            }

            const player = interaction.client.player;
            const queue = player?.nodes.get(guild.id);

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    embeds: [errorEmbed('لا توجد موسيقى قيد التشغيل')],
                    ephemeral: true
                });
            }

            const modeMap = {
                off: 0,
                track: 1,
                queue: 2
            };

            queue.setRepeatMode(modeMap[mode]);

            const messages = {
                off: '🔁 تم إيقاف التكرار',
                track: '🔂 تكرار الأغنية الحالية',
                queue: '🔁 تكرار القائمة بالكامل'
            };

            return interaction.reply({
                embeds: [successEmbed(messages[mode])]
            });

        } catch (error) {
            console.error('Loop error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
