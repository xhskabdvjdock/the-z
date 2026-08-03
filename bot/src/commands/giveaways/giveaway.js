import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { isModerator } from '../../utils/permissions.js';
import Giveaway from '../../models/Giveaway.js';
import { createLog } from '../../systems/logging/logManager.js';
import ms from 'ms';

// Helper functions
async function endGiveaway(guildId, messageId, client) {
  try {
    const giveaway = await Giveaway.findOne({ guildId, messageId, ended: false });
    if (!giveaway) return;

    const channel = client.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    if (!message) return;

    const participants = giveaway.participants;
    if (participants.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 جائزة')
        .setDescription('❌ لم يشارك أحد في الجائزة')
        .setColor('#ED4245')
        .setTimestamp();
      await message.edit({ embeds: [embed], components: [] });
      giveaway.ended = true;
      await giveaway.save();
      return;
    }

    // Select winners
    const winners = [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(giveaway.winners, shuffled.length); i++) {
      winners.push(shuffled[i]);
    }

    giveaway.winnersList = winners;
    giveaway.ended = true;
    await giveaway.save();

    const oldEmbed = message.embeds[0];
    const embed = new EmbedBuilder()
      .setTitle(oldEmbed?.title || '🎉 جائزة')
      .setDescription(
        `**الجائزة:** ${giveaway.prize}\n` +
        `**عدد الفائزين:** ${giveaway.winners}\n` +
        `**الفائزون:** ${winners.map(id => `<@${id}>`).join(', ')}`
      )
      .setColor('#FEE75C')
      .setTimestamp();
    await message.edit({ embeds: [embed], components: [] });

    await channel.send(`🎉 مبروك للفائزين: ${winners.map(id => `<@${id}>`).join(', ')}!`);

    await createLog(guildId, 'giveaway', 'ended', {
      giveawayId: giveaway._id,
      winners: winners,
    }, client);
  } catch (error) {
    console.error('Error ending giveaway:', error);
  }
}

async function rerollGiveaway(guildId, messageId, interaction) {
  try {
    const giveaway = await Giveaway.findOne({ guildId, messageId });
    if (!giveaway) {
      return interaction.reply({ 
        embeds: [errorEmbed('الجائزة غير موجودة')], 
        ephemeral: true 
      });
    }

    const participants = giveaway.participants.filter(id => !giveaway.winnersList.includes(id));
    if (participants.length === 0) {
      return interaction.reply({ 
        embeds: [errorEmbed('لا يوجد مشاركين جدد')], 
        ephemeral: true 
      });
    }

    const winner = participants[Math.floor(Math.random() * participants.length)];
    giveaway.winnersList.push(winner);
    await giveaway.save();

    const channel = interaction.guild.channels.cache.get(giveaway.channelId);
    await channel.send(`🎉 تم إعادة السحب! الفائز الجديد: <@${winner}>!`);

    return interaction.reply({ 
      embeds: [successEmbed(`تم إعادة السحب! الفائز: <@${winner}>`)], 
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error rerolling giveaway:', error);
    return interaction.reply({ 
      embeds: [errorEmbed('حدث خطأ')], 
      ephemeral: true 
    });
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('إدارة الجوائز')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('إنشاء جائزة جديدة')
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('الجائزة')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('المدة (مثال: 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('عدد الفائزين')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('إعادة سحب الجائزة')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('معرف رسالة الجائزة')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('إنهاء الجائزة مبكراً')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('معرف رسالة الجائزة')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const { guild, channel, member, options, client } = interaction;
    const subcommand = options.getSubcommand();

    try {
      if (!isModerator(member)) {
        return interaction.reply({ 
          embeds: [errorEmbed('ليس لديك صلاحية')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'create') {
        const prize = options.getString('prize');
        const duration = options.getString('duration');
        const winners = options.getInteger('winners') || 1;

        const durationMs = ms(duration);
        if (!durationMs) {
          return interaction.reply({ 
            embeds: [errorEmbed('مدة غير صحيحة')], 
            ephemeral: true 
          });
        }

        const endTime = new Date(Date.now() + durationMs);

        const embed = new EmbedBuilder()
          .setTitle('🎉 جائزة جديدة!')
          .setDescription(`**الجائزة:** ${prize}\n**عدد الفائزين:** ${winners}\n**ينتهي:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
          .setColor('#FEE75C')
          .setTimestamp(endTime);

        const button = new ButtonBuilder()
          .setCustomId('giveaway_join')
          .setLabel('🎉 اشترك في الجائزة')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const message = await channel.send({ embeds: [embed], components: [row] });

        const giveaway = new Giveaway({
          guildId: guild.id,
          channelId: channel.id,
          messageId: message.id,
          prize: prize,
          winners: winners,
          endTime: endTime,
        });
        await giveaway.save();

        // Schedule end
        setTimeout(async () => {
          await endGiveaway(guild.id, message.id, client);
        }, durationMs);

        return interaction.reply({ 
          embeds: [successEmbed('تم إنشاء الجائزة بنجاح')], 
          ephemeral: true 
        });
      }

      if (subcommand === 'reroll') {
        const messageId = options.getString('message_id');
        await rerollGiveaway(guild.id, messageId, interaction);
      }

      if (subcommand === 'end') {
        const messageId = options.getString('message_id');
        await endGiveaway(guild.id, messageId, client);
        return interaction.reply({ 
          embeds: [successEmbed('تم إنهاء الجائزة')], 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Giveaway error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ')], 
        ephemeral: true 
      });
    }
  },
};
