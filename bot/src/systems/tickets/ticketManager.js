import { 
  ChannelType, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder 
} from 'discord.js';
import Ticket from '../../models/Ticket.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { createLog } from '../logging/logManager.js';

// دالة مساعدة للتحقق من أن المستخدم لديه رتبة دعم
export async function hasSupportRole(member, guildData) {
  if (!guildData || !guildData.tickets.supportRoles || guildData.tickets.supportRoles.length === 0) {
    return false;
  }
  return member.roles.cache.some(role => guildData.tickets.supportRoles.includes(role.id));
}

export class TicketManager {
  static async createTicket(guild, user, type, client) {
    try {
      const guildData = await Guild.findOne({ guildId: guild.id });
      
      if (!guildData || !guildData.tickets.enabled) {
        throw new Error('Tickets system is not enabled');
      }

      // التحقق من أن المستخدم ليس لديه رتبة محظورة
      const member = await guild.members.fetch(user.id);
      if (guildData.tickets.blockedRoles && guildData.tickets.blockedRoles.length > 0) {
        const hasBlockedRole = member.roles.cache.some(role => 
          guildData.tickets.blockedRoles.includes(role.id)
        );
        if (hasBlockedRole) {
          throw new Error('ليس لديك صلاحية لإنشاء تكت. لديك رتبة محظورة.');
        }
      }

      // Check if user already has an open ticket
      const existingTicket = await Ticket.findOne({
        guildId: guild.id,
        userId: user.id,
        status: 'open',
      });

      if (existingTicket) {
        const channel = guild.channels.cache.get(existingTicket.channelId);
        if (channel) {
          return { error: 'You already have an open ticket', channel };
        }
      }

      // Find ticket type
      const ticketType = guildData.tickets.types.find(t => t.name === type);
      if (!ticketType) {
        throw new Error('Invalid ticket type');
      }

      // Create channel
      const category = guild.channels.cache.get(guildData.tickets.categoryId);
      const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageMessages,
            ],
          },
          ...(ticketType.roleId ? [{
            id: ticketType.roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          }] : []),
        ],
      });

      // Create ticket record
      const ticket = new Ticket({
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id,
        type: type,
        status: 'open',
      });
      await ticket.save();

      // Send welcome message
      const embed = new EmbedBuilder()
        .setTitle(`🎫 تكت ${ticketType.emoji || '📝'}`)
        .setDescription(
          `مرحباً ${user}!\n\n` +
          `**النوع:** ${ticketType.name}\n` +
          `${ticketType.description || ''}\n\n` +
          `**الحالة:** بانتظار الاستلام\n` +
          `سيتم الرد عليك قريباً من قبل فريق الدعم.`
        )
        .setColor('#5865F2')
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('إغلاق التكت')
        .setStyle(ButtonStyle.Danger);

      const claimButton = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('استلام التكت')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(closeButton, claimButton);

      await channel.send({ embeds: [embed], components: [row] });

      // Log
      await createLog(guild.id, 'ticket', 'created', {
        ticketId: ticket._id,
        userId: user.id,
        type: type,
        channelId: channel.id,
      }, client);

      logger.info(`Ticket created: ${channel.id} for user ${user.id}`);
      return { ticket, channel };
    } catch (error) {
      logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  static async closeTicket(channel, user, client) {
    try {
      const ticket = await Ticket.findOne({ channelId: channel.id });
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.status !== 'open') {
        throw new Error('Ticket is already closed');
      }

      // التحقق من أن المستخدم لديه رتبة دعم
      const guildData = await Guild.findOne({ guildId: channel.guild.id });
      const member = await channel.guild.members.fetch(user.id);
      
      if (!await hasSupportRole(member, guildData)) {
        throw new Error('ليس لديك صلاحية لإغلاق التكت. يجب أن تكون لديك رتبة دعم.');
      }

      ticket.status = 'closed';
      ticket.closedBy = user.id;
      ticket.closedAt = new Date();
      await ticket.save();

      // Generate transcript
      const transcript = await this.generateTranscript(channel);
      ticket.transcript = transcript;
      await ticket.save();

      // Send closing message
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إغلاق التكت')
        .setDescription(`تم إغلاق التكت بواسطة ${user}\n\nسيتم حذف القناة خلال 10 ثواني.`)
        .setColor('#57F287')
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Log
      await createLog(channel.guild.id, 'ticket', 'closed', {
        ticketId: ticket._id,
        closedBy: user.id,
        channelId: channel.id,
      }, client);

      // Delete channel after delay
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (error) {
          logger.error('Error deleting ticket channel:', error);
        }
      }, 10000);

      logger.info(`Ticket closed: ${channel.id}`);
      return ticket;
    } catch (error) {
      logger.error('Error closing ticket:', error);
      throw error;
    }
  }

  static async claimTicket(channel, user, client) {
    try {
      const ticket = await Ticket.findOne({ channelId: channel.id });
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.status !== 'open') {
        throw new Error('Ticket is not open');
      }

      // التحقق من أن المستخدم لديه رتبة دعم
      const guildData = await Guild.findOne({ guildId: channel.guild.id });
      const member = await channel.guild.members.fetch(user.id);
      
      if (!await hasSupportRole(member, guildData)) {
        throw new Error('ليس لديك صلاحية لاستلام التكت. يجب أن تكون لديك رتبة دعم.');
      }

      // إذا كان التكت مستلم بالفعل من قبل شخص آخر
      if (ticket.claimedBy && ticket.claimedBy !== user.id) {
        throw new Error('هذا التكت مستلم بالفعل من قبل شخص آخر');
      }

      // إذا كان المستخدم هو من استلم التكت، قم بإلغاء الاستلام
      if (ticket.claimedBy === user.id) {
        ticket.claimedBy = null;
        ticket.claimedAt = null;
        ticket.claimedByUsername = null;
        await ticket.save();

        // تحديث الرسالة
        await this.updateTicketMessage(channel, ticket, client);

        // Log
        await createLog(channel.guild.id, 'ticket', 'unclaimed', {
          ticketId: ticket._id,
          unclaimedBy: user.id,
          channelId: channel.id,
        }, client);

        logger.info(`Ticket unclaimed: ${channel.id} by ${user.id}`);
        return { ticket, action: 'unclaimed' };
      }

      // استلام التكت
      ticket.claimedBy = user.id;
      ticket.claimedAt = new Date();
      ticket.claimedByUsername = user.username;
      await ticket.save();

      // تحديث الرسالة
      await this.updateTicketMessage(channel, ticket, client);

      // Log
      await createLog(channel.guild.id, 'ticket', 'claimed', {
        ticketId: ticket._id,
        claimedBy: user.id,
        channelId: channel.id,
      }, client);

      logger.info(`Ticket claimed: ${channel.id} by ${user.id}`);
      return { ticket, action: 'claimed' };
    } catch (error) {
      logger.error('Error claiming ticket:', error);
      throw error;
    }
  }

  static async updateTicketMessage(channel, ticket, client) {
    try {
      // البحث عن رسالة الترحيب في القناة
      const messages = await channel.messages.fetch({ limit: 10 });
      const welcomeMessage = messages.find(msg => 
        msg.author.id === client.user.id && 
        msg.embeds.length > 0 && 
        msg.embeds[0].title?.includes('تكت')
      );

      if (welcomeMessage) {
        const guildData = await Guild.findOne({ guildId: channel.guild.id });
        const ticketType = guildData?.tickets?.types?.find(t => t.name === ticket.type);

        const embed = new EmbedBuilder()
          .setTitle(`🎫 تكت ${ticketType?.emoji || '📝'}`)
          .setDescription(
            `مرحباً <@${ticket.userId}>!\n\n` +
            `**النوع:** ${ticketType?.name || ticket.type}\n` +
            `${ticketType?.description || ''}\n\n` +
            `${ticket.claimedBy ? `**المستلم:** <@${ticket.claimedBy}> (${ticket.claimedByUsername})\n` : '**الحالة:** بانتظار الاستلام\n'}` +
            `سيتم الرد عليك قريباً من قبل فريق الدعم.`
          )
          .setColor('#5865F2')
          .setTimestamp();

        const closeButton = new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('إغلاق التكت')
          .setStyle(ButtonStyle.Danger);

        const claimButton = new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel(ticket.claimedBy ? 'إلغاء الاستلام' : 'استلام التكت')
          .setStyle(ticket.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(closeButton, claimButton);

        await welcomeMessage.edit({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      logger.error('Error updating ticket message:', error);
    }
  }

  static async reopenTicket(channelId, user, client) {
    try {
      const ticket = await Ticket.findOne({ channelId });
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.status === 'open') {
        throw new Error('Ticket is already open');
      }

      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      ticket.status = 'open';
      ticket.closedBy = null;
      ticket.closedAt = null;
      await ticket.save();

      // Log
      await createLog(channel.guild.id, 'ticket', 'reopened', {
        ticketId: ticket._id,
        reopenedBy: user.id,
        channelId: channel.id,
      }, client);

      logger.info(`Ticket reopened: ${channelId}`);
      return ticket;
    } catch (error) {
      logger.error('Error reopening ticket:', error);
      throw error;
    }
  }

  static async deleteTicket(channelId, user, client) {
    try {
      const ticket = await Ticket.findOne({ channelId });
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      ticket.status = 'deleted';
      ticket.deletedAt = new Date();
      await ticket.save();

      const channel = client.channels.cache.get(channelId);
      if (channel) {
        await channel.delete();
      }

      // Log
      if (channel) {
        await createLog(channel.guild.id, 'ticket', 'deleted', {
          ticketId: ticket._id,
          deletedBy: user.id,
          channelId: channel.id,
        }, client);
      }

      logger.info(`Ticket deleted: ${channelId}`);
      return ticket;
    } catch (error) {
      logger.error('Error deleting ticket:', error);
      throw error;
    }
  }

  static async generateTranscript(channel) {
    try {
      const messages = [];
      let lastId;

      while (true) {
        const options = { limit: 100 };
        if (lastId) {
          options.before = lastId;
        }

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        messages.push(...Array.from(fetched.values()));
        lastId = fetched.last().id;

        if (fetched.size < 100) break;
      }

      messages.reverse();

      let transcript = `# Transcript for ${channel.name}\n\n`;
      transcript += `Created: ${messages[0]?.createdAt || 'Unknown'}\n\n`;
      transcript += '---\n\n';

      for (const message of messages) {
        const date = message.createdAt.toLocaleString('ar-SA');
        transcript += `[${date}] ${message.author.tag} (${message.author.id})\n`;
        transcript += `${message.content}\n`;
        
        if (message.attachments.size > 0) {
          message.attachments.forEach(att => {
            transcript += `Attachment: ${att.url}\n`;
          });
        }
        
        transcript += '\n';
      }

      return transcript;
    } catch (error) {
      logger.error('Error generating transcript:', error);
      return 'Error generating transcript';
    }
  }

  static async saveMessage(channelId, message) {
    try {
      const ticket = await Ticket.findOne({ channelId });
      if (!ticket) return;

      ticket.messages.push({
        userId: message.author.id,
        username: message.author.tag,
        content: message.content,
        timestamp: message.createdAt,
        attachments: message.attachments.map(att => att.url),
      });

      await ticket.save();
    } catch (error) {
      logger.error('Error saving message:', error);
    }
  }
}
