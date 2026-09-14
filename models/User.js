const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    photoUrl: { type: String, default: '' },

    // All balances start at 0 for every user - never pre-seeded.
    balances: {
      usdt: { type: Number, default: 0 },
      gems: { type: Number, default: 0 },
      spins: { type: Number, default: 0 },
      keys: { type: Number, default: 0 },
      diamond: { type: Number, default: 0 }, // referral currency (renamed from WTC)
    },

    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Progress toward "does this referral count yet" (5 tasks + 20 ads, per referral rules)
    referralProgress: {
      tasksCompleted: { type: Number, default: 0 },
      adsWatched: { type: Number, default: 0 },
      joinedChannelVerified: { type: Boolean, default: false },
      firstLootboxClaimed: { type: Boolean, default: false },
      qualified: { type: Boolean, default: false }, // becomes a "valid" referral
    },

    referralStats: {
      totalReferrals: { type: Number, default: 0 },
      totalReferralEarningsDiamond: { type: Number, default: 0 },
    },

    lastSpinAt: { type: Date, default: null },
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
