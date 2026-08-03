import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true },
    question: { type: String, required: true },
    options: [{
        text: String,
        emoji: String,
        votes: [String], // User IDs
    }],
    allowMultiple: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    endTime: Date,
    ended: { type: Boolean, default: false },
    totalVotes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

pollSchema.index({ guildId: 1, ended: 1 });
pollSchema.index({ endTime: 1 });

export default mongoose.model('Poll', pollSchema);
