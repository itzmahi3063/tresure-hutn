const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling, readJsonBody } = require('../lib/respond');
const User = require('../models/User');
const Task = require('../models/Task');
const AdWatch = require('../models/AdWatch');

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' UTC
}

module.exports = withErrorHandling(async (req, res) => {
  await connectDB();
  const { telegramId } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  const dateKey = todayKey();

  if (req.method === 'GET') {
    const slots = await Task.find({ section: 'daily', type: 'ad', active: true, hiddenFromEveryone: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
    const watches = await AdWatch.find({ userId: user._id, dateKey, taskId: { $in: slots.map((s) => s._id) } }).lean();
    const watchMap = new Map(watches.map((w) => [String(w.taskId), w.watchCount]));

    return ok(res, {
      slots: slots.map((s) => ({
        id: s._id,
        title: s.title,
        icon: s.icon,
        adNetwork: s.adNetwork,
        rewardCurrency: s.rewardCurrency,
        rewardAmount: s.rewardAmount,
        dailyLimit: s.adDailyLimit,
        doneToday: watchMap.get(String(s._id)) || 0,
      })),
    });
  }

  if (req.method === 'POST') {
    // completionToken should come from the ad network's own postback/callback
    // (e.g. Adsgram/Monetag reward-confirmation), never fabricated client-side.
    const { taskId, completionToken } = await readJsonBody(req);
    if (!completionToken) return fail(res, 400, 'Missing ad completion token');

    const task = await Task.findById(taskId);
    if (!task || task.type !== 'ad' || !task.active) return fail(res, 404, 'Ad slot not found');

    let watch = await AdWatch.findOne({ userId: user._id, taskId: task._id, dateKey });
    if (!watch) {
      watch = await AdWatch.create({ userId: user._id, taskId: task._id, dateKey, watchCount: 0, creditedTokens: [] });
    }

    if (watch.creditedTokens.includes(completionToken)) {
      return fail(res, 400, 'This ad view was already credited');
    }
    if (watch.watchCount >= task.adDailyLimit) {
      return fail(res, 400, 'Daily limit reached for this ad slot');
    }

    watch.watchCount += 1;
    watch.creditedTokens.push(completionToken);
    await watch.save();

    await User.updateOne({ _id: user._id }, { $inc: { [`balances.${task.rewardCurrency}`]: task.rewardAmount } });

    if (user.referredBy) {
      const fresh = await User.findByIdAndUpdate(
        user._id,
        { $inc: { 'referralProgress.adsWatched': 1 } },
        { new: true }
      );
      const p = fresh.referralProgress;
      if (!p.qualified && p.tasksCompleted >= 5 && p.adsWatched >= 20) {
        await User.updateOne({ _id: user._id }, { $set: { 'referralProgress.qualified': true } });
        await User.updateOne({ _id: user.referredBy }, { $inc: { 'referralStats.totalReferralEarningsDiamond': 100 } });
      }
    }

    return ok(res, { doneToday: watch.watchCount, credited: { currency: task.rewardCurrency, amount: task.rewardAmount } });
  }

  return fail(res, 405, 'Method not allowed');
});
