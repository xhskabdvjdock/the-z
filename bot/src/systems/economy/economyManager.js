import Economy from '../../models/Economy.js';
import logger from '../../utils/logger.js';

export class EconomyManager {
    static currency = '💰';
    static defaultDaily = 100;
    static dailyStreakBonus = 50;
    static workMin = 50;
    static workMax = 200;
    static workCooldown = 3600000; // 1 hour

    // Get or create user economy
    static async getEconomy(guildId, userId) {
        try {
            let economy = await Economy.findOne({ guildId, userId });
            if (!economy) {
                economy = new Economy({ guildId, userId });
                await economy.save();
            }
            return economy;
        } catch (error) {
            logger.error('Error getting economy:', error);
            return null;
        }
    }

    // Add money
    static async addMoney(guildId, userId, amount) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            economy.balance += amount;
            economy.totalEarned += amount;
            await economy.save();
            return economy;
        } catch (error) {
            logger.error('Error adding money:', error);
            return null;
        }
    }

    // Remove money
    static async removeMoney(guildId, userId, amount) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            if (economy.balance < amount) {
                return { error: 'رصيد غير كافٍ' };
            }
            economy.balance -= amount;
            economy.totalSpent += amount;
            await economy.save();
            return economy;
        } catch (error) {
            logger.error('Error removing money:', error);
            return null;
        }
    }

    // Daily reward
    static async claimDaily(guildId, userId) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            const now = new Date();
            const lastDaily = economy.lastDaily ? new Date(economy.lastDaily) : null;

            // Check cooldown (24 hours)
            if (lastDaily) {
                const timeDiff = now - lastDaily;
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                if (hoursDiff < 24) {
                    const hoursLeft = Math.ceil(24 - hoursDiff);
                    return {
                        error: `يمكنك المطالبة بالمكافأة اليومية بعد ${hoursLeft} ساعة`
                    };
                }
            }

            // Check streak
            let streak = economy.dailyStreak || 0;
            if (lastDaily) {
                const daysDiff = Math.floor((now - lastDaily) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    streak++;
                } else if (daysDiff > 1) {
                    streak = 1;
                }
            } else {
                streak = 1;
            }

            const reward = this.defaultDaily + (streak * this.dailyStreakBonus);
            economy.balance += reward;
            economy.totalEarned += reward;
            economy.dailyStreak = streak;
            economy.lastDaily = now;
            await economy.save();

            return { economy, reward, streak };
        } catch (error) {
            logger.error('Error claiming daily:', error);
            return { error: 'حدث خطأ' };
        }
    }

    // Work command
    static async work(guildId, userId) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            const now = new Date();
            const lastWork = economy.lastWork ? new Date(economy.lastWork) : null;

            // Check cooldown
            if (lastWork) {
                const timeDiff = now - lastWork;
                if (timeDiff < this.workCooldown) {
                    const minutesLeft = Math.ceil((this.workCooldown - timeDiff) / (1000 * 60));
                    return {
                        error: `يمكنك العمل مجدداً بعد ${minutesLeft} دقيقة`
                    };
                }
            }

            const earnings = Math.floor(Math.random() * (this.workMax - this.workMin + 1)) + this.workMin;
            economy.balance += earnings;
            economy.totalEarned += earnings;
            economy.lastWork = now;
            await economy.save();

            const jobs = [
                'مبرمج', 'مصمم', 'كاتب', 'معلم', 'طبيب', 'مهندس',
                'محاسب', 'مدير', 'عامل', 'سائق', 'طاهي', 'حارس'
            ];
            const job = jobs[Math.floor(Math.random() * jobs.length)];

            return { economy, earnings, job };
        } catch (error) {
            logger.error('Error working:', error);
            return { error: 'حدث خطأ' };
        }
    }

    // Transfer money
    static async transfer(guildId, fromUserId, toUserId, amount) {
        try {
            if (fromUserId === toUserId) {
                return { error: 'لا يمكنك تحويل الأموال لنفسك' };
            }

            const fromEconomy = await this.getEconomy(guildId, fromUserId);
            if (fromEconomy.balance < amount) {
                return { error: 'رصيد غير كافٍ' };
            }

            const toEconomy = await this.getEconomy(guildId, toUserId);

            fromEconomy.balance -= amount;
            toEconomy.balance += amount;

            await fromEconomy.save();
            await toEconomy.save();

            return { success: true, fromEconomy, toEconomy };
        } catch (error) {
            logger.error('Error transferring money:', error);
            return { error: 'حدث خطأ' };
        }
    }

    // Get leaderboard
    static async getLeaderboard(guildId, limit = 10) {
        try {
            const leaderboard = await Economy.find({ guildId })
                .sort({ balance: -1 })
                .limit(limit)
                .lean();
            return leaderboard;
        } catch (error) {
            logger.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Add item to inventory
    static async addItem(guildId, userId, itemId, itemName, quantity = 1) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            const existingItem = economy.inventory.find(item => item.itemId === itemId);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                economy.inventory.push({ itemId, itemName, quantity });
            }

            await economy.save();
            return economy;
        } catch (error) {
            logger.error('Error adding item:', error);
            return null;
        }
    }

    // Remove item from inventory
    static async removeItem(guildId, userId, itemId, quantity = 1) {
        try {
            const economy = await this.getEconomy(guildId, userId);
            const item = economy.inventory.find(item => item.itemId === itemId);

            if (!item) {
                return { error: 'العنصر غير موجود في المخزون' };
            }

            if (item.quantity < quantity) {
                return { error: 'كمية غير كافية' };
            }

            item.quantity -= quantity;
            if (item.quantity === 0) {
                economy.inventory = economy.inventory.filter(i => i.itemId !== itemId);
            }

            await economy.save();
            return economy;
        } catch (error) {
            logger.error('Error removing item:', error);
            return null;
        }
    }

    // Format currency
    static formatCurrency(amount) {
        return `${this.currency} ${amount.toLocaleString()}`;
    }
}
