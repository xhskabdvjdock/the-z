import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  
  // Daily rewards
  dailyStreak: { type: Number, default: 0 },
  lastDaily: Date,
  
  // Work system
  lastWork: Date,
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  
  // Inventory
  inventory: [{
    itemId: String,
    itemName: String,
    quantity: { type: Number, default: 1 },
    purchasedAt: { type: Date, default: Date.now },
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

economySchema.index({ guildId: 1, userId: 1 }, { unique: true });
economySchema.index({ guildId: 1, balance: -1 });

economySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Economy', economySchema);
