const mongoose = require('mongoose');

const AdWatchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    dateKey: { type: String, required: true }, // 'YYYY-MM-DD' UTC, resets the daily counter
    watchCount: { type: Number, default: 0 },
    // Every credited watch gets its own idempotency token from the ad network's
    // postback / completion callback so the same impression can't be paid twice.
    creditedTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

AdWatchSchema.index({ userId: 1, taskId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.models.AdWatch || mongoose.model('AdWatch', AdWatchSchema);
