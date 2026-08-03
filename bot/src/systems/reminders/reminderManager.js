import Reminder from '../../models/Reminder.js';
import logger from '../../utils/logger.js';

export class ReminderManager {
    static activeReminders = new Map();

    static async checkReminders(client) {
        try {
            const now = new Date();
            const dueReminders = await Reminder.find({
                remindAt: { $lte: now },
                completed: false
            });

            for (const reminder of dueReminders) {
                await this.sendReminder(reminder, client);
            }
        } catch (error) {
            logger.error('Error checking reminders:', error);
        }
    }

    static async sendReminder(reminder, client) {
        try {
            const channel = client.channels.cache.get(reminder.channelId);
            if (!channel) {
                reminder.completed = true;
                await reminder.save();
                return;
            }

            const user = await client.users.fetch(reminder.userId);
            await channel.send({
                content: `⏰ ${user} **تذكير:**\n${reminder.message}`
            });

            if (reminder.repeat.enabled) {
                reminder.remindAt = new Date(Date.now() + reminder.repeat.interval);
                await reminder.save();
            } else {
                reminder.completed = true;
                await reminder.save();
            }

            logger.info(`Sent reminder to ${reminder.userId}`);
        } catch (error) {
            logger.error('Error sending reminder:', error);
            reminder.completed = true;
            await reminder.save();
        }
    }

    static async scheduleReminder(reminder, client) {
        const delay = reminder.remindAt.getTime() - Date.now();

        if (delay <= 0) {
            await this.sendReminder(reminder, client);
            return;
        }

        const timeoutId = setTimeout(async () => {
            await this.sendReminder(reminder, client);
            this.activeReminders.delete(reminder._id.toString());
        }, delay);

        this.activeReminders.set(reminder._id.toString(), timeoutId);
    }

    static async startReminderSystem(client) {
        // Check every minute
        setInterval(() => {
            this.checkReminders(client);
        }, 60000);

        // Load active reminders
        const activeReminders = await Reminder.find({ completed: false });
        for (const reminder of activeReminders) {
            this.scheduleReminder(reminder, client);
        }

        logger.success('Reminder system started');
    }
}
