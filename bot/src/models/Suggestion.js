import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    suggestion: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'considering'],
        default: 'pending'
    },
    upvotes: [String],
    downvotes: [String],
    reviewedBy: String,
    reviewReason: String,
    reviewedAt: Date,
    createdAt: { type: Date, default: Date.now },
});

suggestionSchema.index({ guildId: 1, status: 1 });
suggestionSchema.index({ guildId: 1, userId: 1 });

export default mongoose.model('Suggestion', suggestionSchema);
