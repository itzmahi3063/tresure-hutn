const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling } = require('../lib/respond');
const User = require('../models/User');

// Diamond rewards per referral milestone, mirrors the "How the bonus works" steps.
const BONUS_STEPS = [
  { key: 'joinedChannelVerified', label: 'Friend joins the channel + community and verifies', diamond: 30 },
  { key: 'tasksCompleted5', label: 'Friend completes 5 tasks', diamond: 100 },
  { key: 'adsWatched20', label: 'Friend watches 20 ads', diamond: 180 },
  { key: 'firstLootboxClaimed', label: 'Friend claims their first Treasure Chest', diamond: 90 },
];
const WITHDRAWAL_COMMISSION_PCT = 10;
const DIAMOND_USD_RATE = 0.00004; // matches the Diamond -> USDT convert rate note on Wallet

module.exports = withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');
  await connectDB();

  const { telegramId } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  const botUsername = process.env.BOT_USERNAME || 'YourBot';
  const shareLink = `https://t.me/${botUsername}/app?startapp=ref_${user.telegramId}`;

  ok(res, {
    totalReferrals: user.referralStats.totalReferrals,
    referralEarningsDiamond: user.referralStats.totalReferralEarningsDiamond,
    referralEarningsUsd: +(user.referralStats.totalReferralEarningsDiamond * DIAMOND_USD_RATE).toFixed(4),
    withdrawalCommissionPct: WITHDRAWAL_COMMISSION_PCT,
    bonusPerFriendDiamond: BONUS_STEPS.reduce((s, b) => s + b.diamond, 0),
    bonusSteps: BONUS_STEPS.map((b) => ({
      label: b.label,
      diamond: b.diamond,
      usd: +(b.diamond * DIAMOND_USD_RATE).toFixed(4),
    })),
    shareLink,
  });
});
