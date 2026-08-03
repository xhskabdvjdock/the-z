import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'closed', 'deleted'], 
    default: 'open' 
  },
  messages: [{
    userId: String,
    username: String,
    content: String,
    timestamp: Date,
    attachments: [String],
  }],
  // حقول الاستلام
  claimedBy: { type: String, default: null }, // معرف المستخدم الذي استلم التكت
  claimedAt: { type: Date, default: null }, // وقت الاستلام
  claimedByUsername: { type: String, default: null }, // اسم المستلم
  // حقول الإغلاق
  closedBy: String,
  closedAt: Date,
  deletedAt: Date,
  transcript: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ticketSchema.index({ guildId: 1, userId: 1 });
ticketSchema.index({ status: 1 });

export default mongoose.model('Ticket', ticketSchema);
