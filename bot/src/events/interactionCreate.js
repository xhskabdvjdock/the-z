import { TicketManager } from '../systems/tickets/ticketManager.js';
import { AutoRoleManager } from '../systems/autoroles/autoRoleManager.js';
import { ApplicationManager } from '../systems/applications/applicationManager.js';
import logger from '../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'application_modal') {
        try {
          await interaction.deferReply({ ephemeral: true });
          
          const guildData = await (await import('../models/Guild.js')).default.findOne({ 
            guildId: interaction.guild.id 
          });
          const questions = guildData.applications.questions;
          
          const answers = questions.map((question, index) => ({
            question: question.question,
            answer: interaction.fields.getTextInputValue(`answer_${index}`),
          }));

          const application = await ApplicationManager.createApplication(
            interaction.guild.id,
            interaction.user.id,
            answers
          );

          await ApplicationManager.sendApplicationToTicket(application, interaction.guild, client);

          await interaction.editReply({ 
            content: '✅ تم إرسال تقديمك بنجاح! سيتم مراجعته قريباً.' 
          });
        } catch (error) {
          logger.error('Error handling application modal:', error);
          await interaction.editReply({ 
            content: '❌ حدث خطأ أثناء إرسال التقديم' 
          });
        }
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Ticket buttons
      if (interaction.customId === 'ticket_close') {
        try {
          await interaction.deferUpdate();
          await TicketManager.closeTicket(interaction.channel, interaction.user, client);
        } catch (error) {
          logger.error('Error handling ticket close button:', error);
          await interaction.followUp({ 
            content: '❌ حدث خطأ أثناء إغلاق التكت', 
            ephemeral: true 
          });
        }
        return;
      }

      if (interaction.customId === 'ticket_claim') {
        try {
          await interaction.deferUpdate();
          const result = await TicketManager.claimTicket(interaction.channel, interaction.user, client);
          
          if (result.action === 'claimed') {
            await interaction.followUp({ 
              content: '✅ تم استلام التكت بنجاح!', 
              ephemeral: true 
            });
          } else {
            await interaction.followUp({ 
              content: '✅ تم إلغاء استلام التكت', 
              ephemeral: true 
            });
          }
        } catch (error) {
          logger.error('Error handling ticket claim button:', error);
          await interaction.followUp({ 
            content: `❌ ${error.message}`, 
            ephemeral: true 
          });
        }
        return;
      }

      if (interaction.customId.startsWith('ticket_create_')) {
        try {
          await interaction.deferReply({ ephemeral: true });
          const type = interaction.customId.replace('ticket_create_', '');
          const result = await TicketManager.createTicket(
            interaction.guild, 
            interaction.user, 
            type, 
            client
          );
          
          if (result.error) {
            return interaction.editReply({ content: `❌ ${result.error}` });
          }

          await interaction.editReply({ 
            content: `✅ تم إنشاء التكت: ${result.channel}` 
          });
        } catch (error) {
          logger.error('Error handling ticket create button:', error);
          await interaction.editReply({ 
            content: '❌ حدث خطأ أثناء إنشاء التكت' 
          });
        }
        return;
      }

      // Button roles
      await AutoRoleManager.handleButtonRole(interaction);

      // Giveaway button
      if (interaction.customId === 'giveaway_join') {
        try {
          const giveaway = await import('../../models/Giveaway.js').then(m => m.default);
          const giveawayDoc = await giveaway.findOne({ 
            guildId: interaction.guild.id, 
            messageId: interaction.message.id,
            ended: false,
          });

          if (!giveawayDoc) {
            return interaction.reply({ 
              content: '❌ هذه الجائزة غير موجودة أو انتهت', 
              ephemeral: true 
            });
          }

          if (giveawayDoc.endTime < new Date()) {
            return interaction.reply({ 
              content: '❌ انتهت الجائزة', 
              ephemeral: true 
            });
          }

          if (giveawayDoc.participants.includes(interaction.user.id)) {
            return interaction.reply({ 
              content: '❌ أنت مشترك بالفعل', 
              ephemeral: true 
            });
          }

          giveawayDoc.participants.push(interaction.user.id);
          await giveawayDoc.save();

          await interaction.reply({ 
            content: '✅ تم الاشتراك في الجائزة!', 
            ephemeral: true 
          });
        } catch (error) {
          logger.error('Error handling giveaway join:', error);
          await interaction.reply({ 
            content: '❌ حدث خطأ', 
            ephemeral: true 
          });
        }
      }

      // Application buttons
      if (interaction.customId.startsWith('application_accept_')) {
        try {
          await interaction.deferReply({ ephemeral: true });
          const applicationId = interaction.customId.replace('application_accept_', '');
          await ApplicationManager.acceptApplication(applicationId, interaction.user.id, 'تم القبول من الداشبورد', client);
          await interaction.editReply({ content: '✅ تم قبول التقديم' });
        } catch (error) {
          logger.error('Error accepting application:', error);
          await interaction.editReply({ content: '❌ حدث خطأ' });
        }
        return;
      }

      if (interaction.customId.startsWith('application_reject_')) {
        try {
          await interaction.deferReply({ ephemeral: true });
          const applicationId = interaction.customId.replace('application_reject_', '');
          await ApplicationManager.rejectApplication(applicationId, interaction.user.id, 'تم الرفض من الداشبورد', client);
          await interaction.editReply({ content: '✅ تم رفض التقديم' });
        } catch (error) {
          logger.error('Error rejecting application:', error);
          await interaction.editReply({ content: '❌ حدث خطأ' });
        }
        return;
      }
    }
  },
};
