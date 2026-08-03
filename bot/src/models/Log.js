import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['message', 'voice', 'moderation', 'ticket', 'role', 'giveaway'],
    required: true 
  },
  action: { type: String, required: true },
  userId: String,
  moderatorId: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

logSchema.index({ guildId: 1, type: 1, timestamp: -1 });
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

export default mongoose.model('Log', logSchema);
