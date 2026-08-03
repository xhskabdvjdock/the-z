import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  prize: { type: String, required: true },
  winners: { type: Number, required: true, default: 1 },
  endTime: { type: Date, required: true },
  participants: [String],
  winnersList: [String],
  ended: { type: Boolean, default: false },
  requirements: {
    roleId: String,
    minAccountAge: Number, // days
    minMessages: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endTime: 1 });

export default mongoose.model('Giveaway', giveawaySchema);
