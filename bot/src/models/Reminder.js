import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    message: { type: String, required: true },
    remindAt: { type: Date, required: true },
    repeat: {
        enabled: { type: Boolean, default: false },
        interval: Number, // in milliseconds
    },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

reminderSchema.index({ userId: 1, completed: 1 });
reminderSchema.index({ remindAt: 1, completed: 1 });

export default mongoose.model('Reminder', reminderSchema);
