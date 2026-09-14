const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ['daily', 'social', 'exclusive', 'partner'],
      required: true,
      index: true,
    },
    // 'ad' = Daily-tab watch-to-earn slot (configured entirely from admin panel).
    // 'channel_group' = must be a verified member server-side to complete.
    // 'bot_website' = simple "Go" link, no membership verification.
    type: {
      type: String,
      enum: ['ad', 'channel_group', 'bot_website'],
      required: true,
    },

    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' }, // emoji or image URL

    // Only used when type === 'channel_group'
    targetChatUsername: { type: String, default: '' },
    targetChatId: { type: String, default: '' }, // resolved once bot admin status is verified

    // Only used when type === 'bot_website'
    targetUrl: { type: String, default: '' },

    // Only used when type === 'ad' (Daily tab)
    adNetwork: { type: String, default: '' }, // e.g. 'adsgram', 'monetag'
    adDailyLimit: { type: Number, default: 10 }, // "0 of 10 done" resets daily
    hiddenFromEveryone: { type: Boolean, default: false }, // per-ad hide toggle

    rewardCurrency: { type: String, enum: ['gems', 'usdt'], default: 'gems' },
    rewardAmount: { type: Number, required: true },

    completionCap: { type: Number, default: 0 }, // 0 = unlimited
    completedCount: { type: Number, default: 0 },

    active: { type: Boolean, default: true },
    createdByAdminId: { type: String, default: '' },

    // 'exclusive' tasks a normal user asked admin to post could be tagged here later
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
