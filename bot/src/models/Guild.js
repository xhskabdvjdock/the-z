import mongoose from 'mongoose';

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  
  // Tickets Settings
  tickets: {
    enabled: { type: Boolean, default: false },
    categoryId: String,
    supportRoles: [String], // الرتب المسموح لها بالدعم (إغلاق واستلام التذاكر)
    blockedRoles: [String], // الرتب المحظورة من إنشاء التذاكر
    types: [{
      name: String,
      emoji: String,
      roleId: String,
      description: String,
    }],
  },
  
  // Welcome/Leave Settings
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    message: String,
    embed: {
      enabled: { type: Boolean, default: false },
      title: String,
      description: String,
      color: String,
      image: String,
      thumbnail: Boolean,
    },
    image: {
      enabled: { type: Boolean, default: false },
      background: String,
    },
  },
  leave: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    message: String,
    embed: {
      enabled: { type: Boolean, default: false },
      title: String,
      description: String,
      color: String,
    },
  },
  
  // AutoMod Settings
  automod: {
    enabled: { type: Boolean, default: false },
    antiSpam: { enabled: Boolean, maxMessages: Number, timeWindow: Number },
    antiLinks: { enabled: Boolean, whitelist: [String], channels: [String] },
    antiRaid: { enabled: Boolean, maxJoins: Number, timeWindow: Number },
    antiCaps: { enabled: Boolean, maxPercentage: Number, minLength: Number },
    badWords: { enabled: Boolean, words: [String], action: String },
    punishment: { type: String, enum: ['warn', 'mute', 'kick', 'ban'], default: 'warn' },
  },
  
  // Auto Voice Settings
  autovoice: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    nameFormat: String,
    userLimit: Number,
    locked: { type: Boolean, default: false },
  },
  
  // Auto Roles
  autoroles: {
    enabled: { type: Boolean, default: false },
    roles: [String],
    reactionRoles: [{
      messageId: String,
      channelId: String,
      roles: [{
        emoji: String,
        roleId: String,
      }],
    }],
    buttonRoles: [{
      messageId: String,
      channelId: String,
      roles: [{
        label: String,
        roleId: String,
        style: String,
      }],
    }],
    timeRoles: [{
      roleId: String,
      time: Number, // minutes
    }],
  },
  
  // Logs Settings
  logs: {
    enabled: { type: Boolean, default: false },
    channels: {
      messages: String,
      voice: String,
      moderation: String,
      tickets: String,
      roles: String,
      giveaways: String,
    },
  },
  
  // Music Settings
  music: {
    enabled: { type: Boolean, default: false },
    defaultVolume: { type: Number, default: 50 },
    autoLeave: { type: Boolean, default: true },
    leaveTime: { type: Number, default: 5 }, // minutes
  },
  
  // Auto Lines
  autolines: {
    enabled: { type: Boolean, default: false },
    lines: [{
      channelId: String,
      message: String,
      embed: Object,
      interval: Number, // minutes
      lastSent: Date,
    }],
  },
  
  // Applications
  applications: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    questions: [{
      question: String,
      type: { type: String, enum: ['text', 'number', 'select'], default: 'text' },
      required: { type: Boolean, default: true },
      options: [String], // for select type
    }],
    ticketCategory: String,
  },
  
  // Rating
  rating: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    cooldown: { type: Number, default: 60 }, // seconds
  },
  
  // Giveaways
  giveaways: {
    enabled: { type: Boolean, default: false },
    channelId: String,
  },
  
  // Locked Channels
  lockedChannels: [String],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

guildSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Guild', guildSchema);
