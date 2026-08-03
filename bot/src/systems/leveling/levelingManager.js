import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import logger from '../../utils/logger.js';

export class LevelingManager {
    static xpMin = 15;
    static xpMax = 25;
    static messageCooldown = 60000; // 1 minute
    static levelUpChannels = new Map();

    // Calculate XP needed for next level
    static calculateXPForLevel(level) {
        return 5 * (level ** 2) + (50 * level) + 100;
    }

    // Get or create user level data
    static async getUserLevel(guildId, userId) {
        try {
            let levelData = await Level.findOne({ guildId, userId });
            if (!levelData) {
                levelData = new Level({ guildId, userId });
                await levelData.save();
            }
            return levelData;
        } catch (error) {
            logger.error('Error getting user level:', error);
            return null;
        }
    }

    // Add XP to user
    static async addXP(message) {
        try {
            const { guild, author, channel } = message;
            if (!guild || author.bot) return;

            const levelData = await this.getUserLevel(guild.id, author.id);
            if (!levelData) return;

            // Check cooldown
            const now = Date.now();
            if (levelData.lastMessage) {
                const timeDiff = now - levelData.lastMessage;
                if (timeDiff < this.messageCooldown) return;
            }

            // Add random XP
            const xpEarned = Math.floor(Math.random() * (this.xpMax - this.xpMin + 1)) + this.xpMin;
            levelData.xp += xpEarned;
            levelData.totalXP += xpEarned;
            levelData.lastMessage = now;

            // Check level up
            const xpNeeded = this.calculateXPForLevel(levelData.level);
            if (levelData.xp >= xpNeeded) {
                levelData.level++;
                levelData.xp -= xpNeeded;

                await levelData.save();
                await this.handleLevelUp(message, levelData);
            } else {
                await levelData.save();
            }

            return levelData;
        } catch (error) {
            logger.error('Error adding XP:', error);
        }
    }

    // Handle level up
    static async handleLevelUp(message, levelData) {
        try {
            const { guild, author, channel } = message;

            // Check for level roles
            const guildData = await Guild.findOne({ guildId: guild.id });
            if (guildData?.leveling?.roleRewards) {
                const roleReward = guildData.leveling.roleRewards.find(
                    r => r.level === levelData.level
                );

                if (roleReward) {
                    const role = guild.roles.cache.get(roleReward.roleId);
                    const member = await guild.members.fetch(author.id);
                    if (role && member) {
                        await member.roles.add(role);
                    }
                }
            }

            // Send level up message
            const levelUpImage = await this.generateLevelUpCard(author, levelData.level);

            const levelUpChannel = guildData?.leveling?.levelUpChannel
                ? guild.channels.cache.get(guildData.leveling.levelUpChannel)
                : channel;

            if (levelUpChannel) {
                await levelUpChannel.send({
                    content: `🎉 تهانينا ${author}! وصلت إلى المستوى **${levelData.level}**!`,
                    files: levelUpImage ? [{ attachment: levelUpImage, name: 'levelup.png' }] : []
                });
            }
        } catch (error) {
            logger.error('Error handling level up:', error);
        }
    }

    // Generate level up card
    static async generateLevelUpCard(user, level) {
        try {
            const canvas = createCanvas(800, 200);
            const ctx = canvas.getContext('2d');

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 800, 200);
            gradient.addColorStop(0, '#7289DA');
            gradient.addColorStop(1, '#5865F2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 200);

            // Avatar
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(100, 100, 60, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 40, 40, 120, 120);
            ctx.restore();

            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px Arial';
            ctx.fillText(`Level ${level}!`, 200, 80);
            ctx.font = '30px Arial';
            ctx.fillText(user.username, 200, 130);

            return canvas.toBuffer('image/png');
        } catch (error) {
            logger.error('Error generating level up card:', error);
            return null;
        }
    }

    // Generate rank card
    static async generateRankCard(user, levelData, rank) {
        try {
            const canvas = createCanvas(900, 250);
            const ctx = canvas.getContext('2d');

            // Background
            const gradient = ctx.createLinearGradient(0, 0, 900, 250);
            gradient.addColorStop(0, '#2C2F33');
            gradient.addColorStop(1, '#23272A');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 900, 250);

            // Avatar border
            ctx.strokeStyle = '#5865F2';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(125, 125, 85, 0, Math.PI * 2);
            ctx.stroke();

            // Avatar
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(125, 125, 80, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 45, 45, 160, 160);
            ctx.restore();

            // User info
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px Arial';
            ctx.fillText(user.username, 240, 70);

            // Rank
            ctx.font = '24px Arial';
            ctx.fillStyle = '#99AAB5';
            ctx.fillText(`Rank #${rank}`, 240, 105);

            // Level
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Level ${levelData.level}`, 700, 70);

            // XP progress bar
            const xpNeeded = this.calculateXPForLevel(levelData.level);
            const progress = levelData.xp / xpNeeded;

            // Progress bar background
            ctx.fillStyle = '#23272A';
            ctx.fillRect(240, 130, 600, 40);

            // Progress bar fill
            ctx.fillStyle = '#5865F2';
            ctx.fillRect(240, 130, 600 * progress, 40);

            // XP text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px Arial';
            ctx.fillText(`${levelData.xp} / ${xpNeeded} XP`, 240, 195);

            return canvas.toBuffer('image/png');
        } catch (error) {
            logger.error('Error generating rank card:', error);
            return null;
        }
    }

    // Get leaderboard
    static async getLeaderboard(guildId, limit = 10) {
        try {
            const leaderboard = await Level.find({ guildId })
                .sort({ level: -1, xp: -1 })
                .limit(limit)
                .lean();
            return leaderboard;
        } catch (error) {
            logger.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Get user rank
    static async getUserRank(guildId, userId) {
        try {
            const allLevels = await Level.find({ guildId })
                .sort({ level: -1, xp: -1 })
                .lean();

            const rank = allLevels.findIndex(l => l.userId === userId) + 1;
            return rank || null;
        } catch (error) {
            logger.error('Error getting user rank:', error);
            return null;
        }
    }
}
