import mongoose from 'mongoose';

const warningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  expiresAt: Date,
  active: { type: Boolean, default: true },
});

warningSchema.index({ guildId: 1, userId: 1 });
warningSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Warning', warningSchema);
