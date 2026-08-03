import mongoose from 'mongoose';

const starboardSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    originalMessageId: { type: String, required: true, unique: true },
    originalChannelId: { type: String, required: true },
    starboardMessageId: String,
    stars: [String], // User IDs who starred
    content: String,
    authorId: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now },
});

starboardSchema.index({ guildId: 1 });
starboardSchema.index({ originalMessageId: 1 });

export default mongoose.model('Starboard', starboardSchema);
