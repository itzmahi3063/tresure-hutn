const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountUsdt: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    walletAddress: { type: String, default: '' },
    referrerCommissionPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
