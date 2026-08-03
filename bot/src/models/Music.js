import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  queue: [{
    title: String,
    url: String,
    duration: String,
    requestedBy: String,
    thumbnail: String,
  }],
  currentTrack: {
    title: String,
    url: String,
    duration: String,
    requestedBy: String,
    thumbnail: String,
    position: Number,
  },
  isPlaying: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  volume: { type: Number, default: 50 },
  loop: { type: Boolean, default: false },
  shuffle: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Music', musicSchema);
