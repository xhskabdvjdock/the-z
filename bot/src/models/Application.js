import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  answers: [{
    question: String,
    answer: String,
  }],
  ticketId: String,
  reviewedBy: String,
  reviewReason: String,
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

applicationSchema.index({ guildId: 1, userId: 1 });
applicationSchema.index({ status: 1 });

export default mongoose.model('Application', applicationSchema);
