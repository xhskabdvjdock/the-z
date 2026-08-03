import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  ratedBy: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  timestamp: { type: Date, default: Date.now },
});

ratingSchema.index({ guildId: 1, userId: 1 });
ratingSchema.index({ guildId: 1, ratedBy: 1, timestamp: 1 });

export default mongoose.model('Rating', ratingSchema);
