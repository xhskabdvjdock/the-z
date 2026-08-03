import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Reminder from '../../models/Reminder.js';
import { ReminderManager } from '../../systems/reminders/reminderManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import ms from 'ms';

export default {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('إدارة التذكيرات')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('إنشاء تذكير')
                .addStringOption(option =>
                    option
                        .setName('time')
                        .setDescription('الوقت (مثال: 1h, 30m, 1d)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('رسالة التذكير')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض تذكيراتك')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('إلغاء تذكير')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('معرف التذكير')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const { user, channel, options } = interaction;
        const subcommand = options.getSubcommand();

        try {
            if (subcommand === 'me') {
                const timeStr = options.getString('time');
                const message = options.getString('message');

                const duration = ms(timeStr);
                if (!duration || duration < 60000) { // Min 1 minute
                    return interaction.reply({
                        embeds: [errorEmbed('الوقت غير صحيح (الحد الأدنى دقيقة واحدة)')],
                        ephemeral: true
                    });
                }

                const remindAt = new Date(Date.now() + duration);

                const reminder = new Reminder({
                    guildId: interaction.guild.id,
                    userId: user.id,
                    channelId: channel.id,
                    message,
                    remindAt,
                });

                await reminder.save();
                await ReminderManager.scheduleReminder(reminder, interaction.client);

                return interaction.reply({
                    embeds: [successEmbed(
                        `✅ سأذكرك بـ "${message}" <t:${Math.floor(remindAt.getTime() / 1000)}:R>\n\n` +
                        `معرف التذكير: \`${reminder._id}\``
                    )],
                    ephemeral: true
                });
            }

            if (subcommand === 'list') {
                const reminders = await Reminder.find({
                    userId: user.id,
                    completed: false
                }).sort({ remindAt: 1 }).limit(10);

                if (!reminders.length) {
                    return interaction.reply({
                        embeds: [errorEmbed('لا توجد تذكيرات')],
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('⏰ تذكيراتك')
                    .setColor('#5865F2')
                    .setDescription(
                        reminders.map((r, i) =>
                            `**${i + 1}.** ${r.message}\n` +
                            `⏰ <t:${Math.floor(r.remindAt.getTime() / 1000)}:R>\n` +
                            `ID: \`${r._id}\``
                        ).join('\n\n')
                    )
                    .setFooter({ text: `المجموع: ${reminders.length}` })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (subcommand === 'cancel') {
                const id = options.getString('id');

                const reminder = await Reminder.findOneAndDelete({
                    _id: id,
                    userId: user.id,
                    completed: false
                });

                if (!reminder) {
                    return interaction.reply({
                        embeds: [errorEmbed('التذكير غير موجود')],
                        ephemeral: true
                    });
                }

                // Cancel scheduled timeout
                const timeoutId = ReminderManager.activeReminders.get(id);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    ReminderManager.activeReminders.delete(id);
                }

                return interaction.reply({
                    embeds: [successEmbed('تم إلغاء التذكير بنجاح')],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Remind error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
