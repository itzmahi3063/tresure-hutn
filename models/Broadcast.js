const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    sentByAdminId: { type: String, required: true },
    targetCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    status: { type: String, enum: ['queued', 'sending', 'done', 'failed'], default: 'queued' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Broadcast || mongoose.model('Broadcast', BroadcastSchema);
