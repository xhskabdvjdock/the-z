import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createLog } from '../logging/logManager.js';
import logger from '../../utils/logger.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WelcomeManager {
  static replaceVariables(text, member, guild) {
    if (!text) return '';
    
    return text
      .replace(/{user}/g, member.user.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag)
      .replace(/{mention}/g, member.toString())
      .replace(/{server}/g, guild.name)
      .replace(/{memberCount}/g, guild.memberCount.toString())
      .replace(/{memberCountOrdinal}/g, this.getOrdinal(guild.memberCount))
      .replace(/{createdAt}/g, member.user.createdAt.toLocaleDateString('ar-SA'))
      .replace(/{joinedAt}/g, member.joinedAt?.toLocaleDateString('ar-SA') || 'غير متاح');
  }

  static getOrdinal(n) {
    const suffixes = ['', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  static async sendWelcome(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id });
      if (!guildData || !guildData.welcome.enabled) return;

      const channel = member.guild.channels.cache.get(guildData.welcome.channelId);
      if (!channel) return;

      const welcomeConfig = guildData.welcome;

      // Send image if enabled
      if (welcomeConfig.image?.enabled) {
        try {
          const image = await this.generateWelcomeImage(member, welcomeConfig.image.background);
          const attachment = new AttachmentBuilder(image, { name: 'welcome.png' });
          await channel.send({ files: [attachment] });
        } catch (error) {
          logger.error('Error generating welcome image:', error);
        }
      }

      // Send embed if enabled
      if (welcomeConfig.embed?.enabled) {
        const embed = new EmbedBuilder()
          .setTitle(this.replaceVariables(welcomeConfig.embed.title || 'مرحباً {user}!', member, member.guild))
          .setDescription(this.replaceVariables(welcomeConfig.embed.description || 'مرحباً بك في {server}!', member, member.guild))
          .setColor(welcomeConfig.embed.color || '#5865F2')
          .setTimestamp();

        if (welcomeConfig.embed.thumbnail) {
          embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        }

        if (welcomeConfig.embed.image) {
          embed.setImage(welcomeConfig.embed.image);
        }

        await channel.send({ embeds: [embed] });
      } else if (welcomeConfig.message) {
        // Send text message
        const message = this.replaceVariables(welcomeConfig.message, member, member.guild);
        await channel.send(message);
      }

      // Log
      await createLog(member.guild.id, 'message', 'member_join', {
        userId: member.id,
      }, client);
    } catch (error) {
      logger.error('Error sending welcome message:', error);
    }
  }

  static async sendLeave(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id });
      if (!guildData || !guildData.leave.enabled) return;

      const channel = member.guild.channels.cache.get(guildData.leave.channelId);
      if (!channel) return;

      const leaveConfig = guildData.leave;

      // Send embed if enabled
      if (leaveConfig.embed?.enabled) {
        const embed = new EmbedBuilder()
          .setTitle(this.replaceVariables(leaveConfig.embed.title || 'وداعاً {user}', member, member.guild))
          .setDescription(this.replaceVariables(leaveConfig.embed.description || 'غادر {user} السيرفر', member, member.guild))
          .setColor(leaveConfig.embed.color || '#ED4245')
          .setTimestamp()
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

        await channel.send({ embeds: [embed] });
      } else if (leaveConfig.message) {
        // Send text message
        const message = this.replaceVariables(leaveConfig.message, member, member.guild);
        await channel.send(message);
      }

      // Log
      await createLog(member.guild.id, 'message', 'member_leave', {
        userId: member.id,
      }, client);
    } catch (error) {
      logger.error('Error sending leave message:', error);
    }
  }

  static async generateWelcomeImage(member, backgroundUrl) {
    try {
      const canvas = createCanvas(1024, 500);
      const ctx = canvas.getContext('2d');

      // Load background
      let background;
      if (backgroundUrl && fs.existsSync(backgroundUrl)) {
        background = await loadImage(backgroundUrl);
      } else {
        // Default gradient background
        const gradient = ctx.createLinearGradient(0, 0, 1024, 500);
        gradient.addColorStop(0, '#5865F2');
        gradient.addColorStop(1, '#23272A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 500);
      }

      if (background) {
        ctx.drawImage(background, 0, 0, 1024, 500);
      }

      // Draw avatar
      const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.save();
      ctx.beginPath();
      ctx.arc(512, 166, 100, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 412, 66, 200, 200);
      ctx.restore();

      // Draw text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('مرحباً', 512, 350);

      ctx.font = '40px Arial';
      ctx.fillText(member.user.username, 512, 400);

      ctx.font = '30px Arial';
      ctx.fillText(`أنت العضو رقم ${member.guild.memberCount}`, 512, 450);

      return canvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Error generating welcome image:', error);
      throw error;
    }
  }
}
