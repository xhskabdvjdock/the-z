import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TicketManager, hasSupportRole } from '../../systems/tickets/ticketManager.js';
import Guild from '../../models/Guild.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('إدارة نظام التكتات')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('إنشاء تكت جديد')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('نوع التكت')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('إغلاق التكت الحالي')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reopen')
        .setDescription('إعادة فتح تكت مغلق')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة التكت')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('حذف تكت')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة التكت')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('إنشاء لوحة التكتات')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setsupportrole')
        .setDescription('إضافة رتبة دعم')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('الرتبة')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('removesupportrole')
        .setDescription('إزالة رتبة دعم')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('الرتبة')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setblockedrole')
        .setDescription('إضافة رتبة محظورة')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('الرتبة')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('removeblockedrole')
        .setDescription('إزالة رتبة محظورة')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('الرتبة')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('استلام التكت الحالي')
    ),

  async execute(interaction) {
    const { client, guild, channel, member } = interaction;

    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'create') {
        const type = interaction.options.getString('type');
        const result = await TicketManager.createTicket(guild, member.user, type, client);
        
        if (result.error) {
          return interaction.reply({ 
            embeds: [errorEmbed(result.error)], 
            ephemeral: true 
          });
        }

        return interaction.reply({ 
          embeds: [successEmbed(`تم إنشاء التكت: ${result.channel}`)], 
          ephemeral: true 
        });
      }

      if (subcommand === 'close') {
        if (!channel.name.startsWith('ticket-')) {
          return interaction.reply({ 
            embeds: [errorEmbed('هذه القناة ليست تكت')], 
            ephemeral: true 
          });
        }

        // التحقق من أن المستخدم لديه رتبة دعم
        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!await hasSupportRole(member, guildData)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية لإغلاق التكت. يجب أن تكون لديك رتبة دعم.')], 
            ephemeral: true 
          });
        }

        await TicketManager.closeTicket(channel, member.user, client);
        return interaction.reply({ 
          embeds: [successEmbed('تم إغلاق التكت')] 
        });
      }

      if (subcommand === 'reopen') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const ticketChannel = interaction.options.getChannel('channel');
        await TicketManager.reopenTicket(ticketChannel.id, member.user, client);
        return interaction.reply({ 
          embeds: [successEmbed('تم إعادة فتح التكت')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'delete') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const ticketChannel = interaction.options.getChannel('channel');
        await TicketManager.deleteTicket(ticketChannel.id, member.user, client);
        return interaction.reply({ 
          embeds: [successEmbed('تم حذف التكت')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'panel') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!guildData || !guildData.tickets.enabled) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التكتات غير مفعّل')], 
            ephemeral: true 
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎫 نظام التكتات')
          .setDescription('اختر نوع التكت الذي تريد إنشاءه:')
          .setColor('#5865F2');

        const buttons = guildData.tickets.types.map(type => 
          new ButtonBuilder()
            .setCustomId(`ticket_create_${type.name}`)
            .setLabel(type.name)
            .setEmoji(type.emoji || '📝')
            .setStyle(ButtonStyle.Primary)
        );

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
          rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        await interaction.reply({ embeds: [embed], components: rows });
      }

      if (subcommand === 'setsupportrole') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const role = interaction.options.getRole('role');
        const guildData = await Guild.findOne({ guildId: guild.id });
        
        if (!guildData) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التكتات غير مفعّل')], 
            ephemeral: true 
          });
        }

        if (!guildData.tickets.supportRoles) {
          guildData.tickets.supportRoles = [];
        }

        if (!guildData.tickets.supportRoles.includes(role.id)) {
          guildData.tickets.supportRoles.push(role.id);
          await guildData.save();
          return interaction.reply({ 
            embeds: [successEmbed(`تم إضافة ${role.name} كرتبة دعم`)] 
          });
        }

        return interaction.reply({ 
          embeds: [errorEmbed('هذه الرتبة موجودة بالفعل')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'removesupportrole') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const role = interaction.options.getRole('role');
        const guildData = await Guild.findOne({ guildId: guild.id });
        
        if (!guildData || !guildData.tickets.supportRoles) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التكتات غير مفعّل')], 
            ephemeral: true 
          });
        }

        const index = guildData.tickets.supportRoles.indexOf(role.id);
        if (index > -1) {
          guildData.tickets.supportRoles.splice(index, 1);
          await guildData.save();
          return interaction.reply({ 
            embeds: [successEmbed(`تم إزالة ${role.name} من رتب الدعم`)] 
          });
        }

        return interaction.reply({ 
          embeds: [errorEmbed('هذه الرتبة غير موجودة في رتب الدعم')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'setblockedrole') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const role = interaction.options.getRole('role');
        const guildData = await Guild.findOne({ guildId: guild.id });
        
        if (!guildData) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التكتات غير مفعّل')], 
            ephemeral: true 
          });
        }

        if (!guildData.tickets.blockedRoles) {
          guildData.tickets.blockedRoles = [];
        }

        if (!guildData.tickets.blockedRoles.includes(role.id)) {
          guildData.tickets.blockedRoles.push(role.id);
          await guildData.save();
          return interaction.reply({ 
            embeds: [successEmbed(`تم إضافة ${role.name} كرتبة محظورة`)] 
          });
        }

        return interaction.reply({ 
          embeds: [errorEmbed('هذه الرتبة موجودة بالفعل')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'removeblockedrole') {
        if (!isModerator(member)) {
          return interaction.reply({ 
            embeds: [errorEmbed('ليس لديك صلاحية')], 
            ephemeral: true 
          });
        }

        const role = interaction.options.getRole('role');
        const guildData = await Guild.findOne({ guildId: guild.id });
        
        if (!guildData || !guildData.tickets.blockedRoles) {
          return interaction.reply({ 
            embeds: [errorEmbed('نظام التكتات غير مفعّل')], 
            ephemeral: true 
          });
        }

        const index = guildData.tickets.blockedRoles.indexOf(role.id);
        if (index > -1) {
          guildData.tickets.blockedRoles.splice(index, 1);
          await guildData.save();
          return interaction.reply({ 
            embeds: [successEmbed(`تم إزالة ${role.name} من الرتب المحظورة`)] 
          });
        }

        return interaction.reply({ 
          embeds: [errorEmbed('هذه الرتبة غير موجودة في الرتب المحظورة')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'claim') {
        if (!channel.name.startsWith('ticket-')) {
          return interaction.reply({ 
            embeds: [errorEmbed('هذه القناة ليست تكت')], 
            ephemeral: true 
          });
        }

        const result = await TicketManager.claimTicket(channel, member.user, client);
        
        if (result.action === 'claimed') {
          return interaction.reply({ 
            embeds: [successEmbed('تم استلام التكت بنجاح!')] 
          });
        } else {
          return interaction.reply({ 
            embeds: [successEmbed('تم إلغاء استلام التكت')] 
          });
        }
      }
    } catch (error) {
      console.error('Ticket command error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء تنفيذ الأمر')], 
        ephemeral: true 
      });
    }
  },
};
