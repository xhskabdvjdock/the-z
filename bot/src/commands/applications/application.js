import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { ApplicationManager } from '../../systems/applications/applicationManager.js';
import Guild from '../../models/Guild.js';

export default {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('تقديم طلب')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('إنشاء تقديم جديد')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('قبول تقديم')
        .addStringOption(option =>
          option
            .setName('application_id')
            .setDescription('معرف التقديم')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('السبب')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reject')
        .setDescription('رفض تقديم')
        .addStringOption(option =>
          option
            .setName('application_id')
            .setDescription('معرف التقديم')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('السبب')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const subcommand = options.getSubcommand();

    try {
      if (subcommand === 'create') {
        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!guildData || !guildData.applications.enabled) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التقديم غير مفعّل')], 
            ephemeral: true 
          });
        }

        const questions = guildData.applications.questions;
        if (questions.length === 0) {
          return interaction.reply({ 
            embeds: [errorEmbed('لا توجد أسئلة مضافة')], 
            ephemeral: true 
          });
        }

        // Create modal
        const modal = new ModalBuilder()
          .setCustomId('application_modal')
          .setTitle('تقديم طلب');

        questions.forEach((question, index) => {
          const input = new TextInputBuilder()
            .setCustomId(`answer_${index}`)
            .setLabel(question.question)
            .setStyle(question.type === 'number' ? TextInputStyle.Short : TextInputStyle.Paragraph)
            .setRequired(question.required)
            .setPlaceholder('اكتب إجابتك هنا...');

          if (question.type === 'select' && question.options) {
            input.setPlaceholder(`اختر: ${question.options.join(', ')}`);
          }

          const row = new ActionRowBuilder().addComponents(input);
          modal.addComponents(row);
        });

        await interaction.showModal(modal);
      }

      if (subcommand === 'accept' || subcommand === 'reject') {
        const applicationId = options.getString('application_id');
        const reason = options.getString('reason') || 'لا يوجد سبب';

        if (subcommand === 'accept') {
          await ApplicationManager.acceptApplication(applicationId, member.id, reason, interaction.client);
          return interaction.reply({ 
            embeds: [successEmbed('تم قبول التقديم')], 
            ephemeral: true 
          });
        } else {
          await ApplicationManager.rejectApplication(applicationId, member.id, reason, interaction.client);
          return interaction.reply({ 
            embeds: [successEmbed('تم رفض التقديم')], 
            ephemeral: true 
          });
        }
      }
    } catch (error) {
      console.error('Application error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ')], 
        ephemeral: true 
      });
    }
  },
};
