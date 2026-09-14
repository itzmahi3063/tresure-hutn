const mongoose = require('mongoose');

const TaskCompletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    rewardCurrency: { type: String, required: true },
    rewardAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

// A user can never claim the same task's reward twice - enforced at the DB level.
TaskCompletionSchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.models.TaskCompletion || mongoose.model('TaskCompletion', TaskCompletionSchema);
