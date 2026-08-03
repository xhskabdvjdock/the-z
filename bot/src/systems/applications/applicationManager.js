import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Application from '../../models/Application.js';
import Guild from '../../models/Guild.js';
import { TicketManager } from '../tickets/ticketManager.js';
import { createLog } from '../logging/logManager.js';
import logger from '../../utils/logger.js';

export class ApplicationManager {
  static async createApplication(guildId, userId, answers) {
    try {
      const application = new Application({
        guildId,
        userId,
        answers,
        status: 'pending',
      });
      await application.save();
      return application;
    } catch (error) {
      logger.error('Error creating application:', error);
      throw error;
    }
  }

  static async sendApplicationToTicket(application, guild, client) {
    try {
      const guildData = await Guild.findOne({ guildId: guild.id });
      if (!guildData || !guildData.applications.enabled) return;

      // Create ticket for application
      const member = await guild.members.fetch(application.userId);
      const result = await TicketManager.createTicket(
        guild,
        member.user,
        'application',
        client
      );

      if (result.error) {
        throw new Error(result.error);
      }

      application.ticketId = result.channel.id;
      await application.save();

      // Send application in ticket
      const embed = new EmbedBuilder()
        .setTitle('📝 تقديم جديد')
        .setDescription(`تقديم من ${member.user.tag}`)
        .setColor('#5865F2')
        .setTimestamp();

      const questions = guildData.applications.questions;
      application.answers.forEach((answer, index) => {
        const question = questions[index]?.question || `سؤال ${index + 1}`;
        embed.addFields({ name: question, value: answer.answer || 'لا يوجد إجابة', inline: false });
      });

      const acceptButton = new ButtonBuilder()
        .setCustomId(`application_accept_${application._id}`)
        .setLabel('قبول')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`application_reject_${application._id}`)
        .setLabel('رفض')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

      await result.channel.send({ embeds: [embed], components: [row] });

      await createLog(guild.id, 'ticket', 'application_created', {
        applicationId: application._id,
        userId: application.userId,
        ticketId: result.channel.id,
      }, client);

      return result.channel;
    } catch (error) {
      logger.error('Error sending application to ticket:', error);
      throw error;
    }
  }

  static async acceptApplication(applicationId, moderatorId, reason, client) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) throw new Error('Application not found');

      application.status = 'accepted';
      application.reviewedBy = moderatorId;
      application.reviewReason = reason;
      application.reviewedAt = new Date();
      await application.save();

      const guild = client.guilds.cache.get(application.guildId);
      const member = await guild.members.fetch(application.userId);

      try {
        await member.send(`✅ تم قبول تقديمك في ${guild.name}\n**السبب:** ${reason || 'لا يوجد سبب'}`);
      } catch (error) {
        // User has DMs disabled
      }

      await createLog(application.guildId, 'ticket', 'application_accepted', {
        applicationId: application._id,
        userId: application.userId,
        moderatorId: moderatorId,
        reason: reason,
      }, client);

      return application;
    } catch (error) {
      logger.error('Error accepting application:', error);
      throw error;
    }
  }

  static async rejectApplication(applicationId, moderatorId, reason, client) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) throw new Error('Application not found');

      application.status = 'rejected';
      application.reviewedBy = moderatorId;
      application.reviewReason = reason;
      application.reviewedAt = new Date();
      await application.save();

      const guild = client.guilds.cache.get(application.guildId);
      const member = await guild.members.fetch(application.userId);

      try {
        await member.send(`❌ تم رفض تقديمك في ${guild.name}\n**السبب:** ${reason || 'لا يوجد سبب'}`);
      } catch (error) {
        // User has DMs disabled
      }

      await createLog(application.guildId, 'ticket', 'application_rejected', {
        applicationId: application._id,
        userId: application.userId,
        moderatorId: moderatorId,
        reason: reason,
      }, client);

      return application;
    } catch (error) {
      logger.error('Error rejecting application:', error);
      throw error;
    }
  }
}
