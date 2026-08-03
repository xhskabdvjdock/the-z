import mongoose from 'mongoose';

const customCommandSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    response: { type: String, required: true },
    embed: {
        enabled: { type: Boolean, default: false },
        title: String,
        description: String,
        color: String,
        footer: String,
        image: String,
        thumbnail: String,
    },
    permissions: {
        roles: [String],
        users: [String],
        channels: [String],
    },
    cooldown: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

customCommandSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('CustomCommand', customCommandSchema);
