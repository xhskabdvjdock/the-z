import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { LevelingManager } from '../../systems/leveling/levelingManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('عرض بطاقة رتبتك أو رتبة عضو آخر')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المراد عرض رتبته')
                .setRequired(false)
        ),

    async execute(interaction) {
        const { guild, user, options } = interaction;
        const targetUser = options.getUser('user') || user;

        try {
            await interaction.deferReply();

            const levelData = await LevelingManager.getUserLevel(guild.id, targetUser.id);
            const rank = await LevelingManager.getUserRank(guild.id, targetUser.id);

            if (!levelData || !rank) {
                return interaction.editReply({
                    embeds: [errorEmbed('لم يتم العثور على بيانات')]
                });
            }

            const rankCard = await LevelingManager.generateRankCard(targetUser, levelData, rank);

            if (!rankCard) {
                return interaction.editReply({
                    embeds: [errorEmbed('حدث خطأ في إنشاء البطاقة')]
                });
            }

            const attachment = new AttachmentBuilder(rankCard, { name: 'rank.png' });

            return interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error('Rank error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('حدث خطأ أثناء عرض الرتبة')]
            });
        }
    },
};
