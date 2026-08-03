import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import CustomCommand from '../../models/CustomCommand.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('customcommand')
        .setDescription('إدارة الأوامر المخصصة')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('إضافة أمر مخصص')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('اسم الأمر')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('response')
                        .setDescription('الرد على الأمر')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('حذف أمر مخصص')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('اسم الأمر')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('تعديل أمر مخصص')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('اسم الأمر')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('response')
                        .setDescription('الرد الجديد')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض جميع الأوامر المخصصة')
        ),

    async execute(interaction) {
        const { guild, member, options } = interaction;
        const subcommand = options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const name = options.getString('name').toLowerCase();
                const response = options.getString('response');

                const existing = await CustomCommand.findOne({ guildId: guild.id, name });
                if (existing) {
                    return interaction.reply({
                        embeds: [errorEmbed('هذا الأمر موجود بالفعل')],
                        ephemeral: true
                    });
                }

                const command = new CustomCommand({
                    guildId: guild.id,
                    name,
                    response,
                    createdBy: member.id,
                });

                await command.save();

                return interaction.reply({
                    embeds: [successEmbed(`تمت إضافة الأمر \`${name}\` بنجاح!`)]
                });
            }

            if (subcommand === 'remove') {
                const name = options.getString('name').toLowerCase();

                const result = await CustomCommand.findOneAndDelete({ guildId: guild.id, name });

                if (!result) {
                    return interaction.reply({
                        embeds: [errorEmbed('الأمر غير موجود')],
                        ephemeral: true
                    });
                }

                return interaction.reply({
                    embeds: [successEmbed(`تم حذف الأمر \`${name}\` بنجاح!`)]
                });
            }

            if (subcommand === 'edit') {
                const name = options.getString('name').toLowerCase();
                const response = options.getString('response');

                const command = await CustomCommand.findOne({ guildId: guild.id, name });

                if (!command) {
                    return interaction.reply({
                        embeds: [errorEmbed('الأمر غير موجود')],
                        ephemeral: true
                    });
                }

                command.response = response;
                await command.save();

                return interaction.reply({
                    embeds: [successEmbed(`تم تعديل الأمر \`${name}\` بنجاح!`)]
                });
            }

            if (subcommand === 'list') {
                const commands = await CustomCommand.find({ guildId: guild.id, enabled: true });

                if (!commands.length) {
                    return interaction.reply({
                        embeds: [errorEmbed('لا توجد أوامر مخصصة')],
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📝 الأوامر المخصصة')
                    .setColor('#5865F2')
                    .setDescription(
                        commands.map((cmd, i) =>
                            `**${i + 1}.** \`${cmd.name}\`\n   └ استخدامات: ${cmd.uses}`
                        ).join('\n')
                    )
                    .setFooter({ text: `المجموع: ${commands.length} أمر` })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Custom command error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
