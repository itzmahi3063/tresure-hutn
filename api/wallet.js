const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling, readJsonBody } = require('../lib/respond');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');

const DIAMOND_TO_USDT_RATE = 0.00004;
const MIN_WITHDRAW_USDT = 1; // adjust to taste from admin panel later

module.exports = withErrorHandling(async (req, res) => {
  await connectDB();
  const { telegramId } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  if (req.method === 'GET') {
    return ok(res, { balances: user.balances, diamondToUsdtRate: DIAMOND_TO_USDT_RATE, minWithdrawUsdt: MIN_WITHDRAW_USDT });
  }

  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const body = await readJsonBody(req);

  if (body.action === 'withdraw') {
    const amount = Number(body.amountUsdt);
    if (!amount || amount <= 0) return fail(res, 400, 'Invalid amount');
    if (amount < MIN_WITHDRAW_USDT) return fail(res, 400, `Minimum withdrawal is $${MIN_WITHDRAW_USDT}`);
    if (!body.walletAddress) return fail(res, 400, 'Wallet address is required');

    // Atomic debit - only succeeds if the user actually has enough USDT right now.
    const updated = await User.findOneAndUpdate(
      { telegramId, 'balances.usdt': { $gte: amount } },
      { $inc: { 'balances.usdt': -amount } },
      { new: true }
    );
    if (!updated) return fail(res, 400, 'Insufficient USDT balance');

    const withdrawal = await Withdrawal.create({
      userId: user._id,
      amountUsdt: amount,
      walletAddress: body.walletAddress,
      status: 'pending',
    });

    // Pay the referrer's lifetime 10% commission on every withdrawal a qualified referral makes.
    if (user.referredBy && user.referralProgress.qualified) {
      const commission = +(amount * 0.1).toFixed(6);
      await User.updateOne({ _id: user.referredBy }, { $inc: { 'balances.usdt': commission } });
      withdrawal.referrerCommissionPaid = true;
      await withdrawal.save();
    }

    return ok(res, { withdrawalId: withdrawal._id, status: withdrawal.status, balances: updated.balances });
  }

  if (body.action === 'convert') {
    const diamondAmount = Number(body.diamondAmount);
    if (!diamondAmount || diamondAmount <= 0) return fail(res, 400, 'Invalid amount');

    const usdtAmount = +(diamondAmount * DIAMOND_TO_USDT_RATE).toFixed(6);

    const updated = await User.findOneAndUpdate(
      { telegramId, 'balances.diamond': { $gte: diamondAmount } },
      { $inc: { 'balances.diamond': -diamondAmount, 'balances.usdt': usdtAmount } },
      { new: true }
    );
    if (!updated) return fail(res, 400, 'Insufficient Diamond balance');

    return ok(res, { convertedUsdt: usdtAmount, balances: updated.balances });
  }

  return fail(res, 400, 'Unknown action');
});
