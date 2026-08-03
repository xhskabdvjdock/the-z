import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    emoji: String,
    category: String,
    stock: { type: Number, default: -1 }, // -1 = unlimited
    role: String, // Role ID to give on purchase
    enabled: { type: Boolean, default: true },
    purchases: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, enabled: 1 });

export default mongoose.model('ShopItem', shopItemSchema);
