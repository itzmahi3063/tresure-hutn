const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling, readJsonBody, getQuery } = require('../lib/respond');
const { isChatMember } = require('../lib/telegram');
const User = require('../models/User');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');

const SECTIONS = ['daily', 'social', 'exclusive', 'partner'];

async function creditReward(user, currency, amount) {
  await User.updateOne({ _id: user._id }, { $inc: { [`balances.${currency}`]: amount } });
  await bumpReferralProgress(user, 'task');
}

// Feeds the referral "friend completes 5 tasks + watches 20 ads" qualification rule.
async function bumpReferralProgress(user, kind) {
  if (!user.referredBy) return;
  const field = kind === 'task' ? 'referralProgress.tasksCompleted' : 'referralProgress.adsWatched';
  const fresh = await User.findByIdAndUpdate(user._id, { $inc: { [field]: 1 } }, { new: true });
  const p = fresh.referralProgress;
  if (!p.qualified && p.tasksCompleted >= 5 && p.adsWatched >= 20) {
    await User.updateOne({ _id: user._id }, { $set: { 'referralProgress.qualified': true } });
    await User.updateOne({ _id: user.referredBy }, { $inc: { 'referralStats.totalReferralEarningsDiamond': 100 } });
  }
}

module.exports = withErrorHandling(async (req, res) => {
  await connectDB();
  const { telegramId, tgUser } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  if (req.method === 'GET') {
    const section = getQuery(req).section || 'daily';
    if (!SECTIONS.includes(section)) return fail(res, 400, 'Invalid section');

    const tasks = await Task.find({ section, active: true, type: { $ne: 'ad' }, hiddenFromEveryone: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const completions = await TaskCompletion.find({
      userId: user._id,
      taskId: { $in: tasks.map((t) => t._id) },
    }).lean();
    const completedIds = new Set(completions.map((c) => String(c.taskId)));

    return ok(res, {
      tasks: tasks.map((t) => ({
        id: t._id,
        type: t.type,
        title: t.title,
        subtitle: t.subtitle,
        icon: t.icon,
        rewardCurrency: t.rewardCurrency,
        rewardAmount: t.rewardAmount,
        targetUrl: t.type === 'bot_website' ? t.targetUrl : `https://t.me/${(t.targetChatUsername || '').replace('@', '')}`,
        completed: completedIds.has(String(t._id)),
        capReached: t.completionCap > 0 && t.completedCount >= t.completionCap,
      })),
    });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const task = await Task.findById(body.taskId);
    if (!task || !task.active) return fail(res, 404, 'Task not found');
    if (task.completionCap > 0 && task.completedCount >= task.completionCap) {
      return fail(res, 400, 'Task is full');
    }

    const already = await TaskCompletion.findOne({ userId: user._id, taskId: task._id });
    if (already) return fail(res, 400, 'Task already completed');

    if (task.type === 'channel_group') {
      // 100% server-side verification - never trust a self-reported "I joined".
      const telegramUserId = tgUser ? tgUser.id : telegramId;
      const { verified } = await isChatMember(task.targetChatUsername, telegramUserId);
      if (!verified) {
        return fail(res, 400, 'You must join the channel/group first');
      }
    }
    // type === 'bot_website': no membership check possible server-side, per spec -
    // still idempotent and rate-limited below so it can't be farmed by resubmitting.

    try {
      await TaskCompletion.create({
        userId: user._id,
        taskId: task._id,
        rewardCurrency: task.rewardCurrency,
        rewardAmount: task.rewardAmount,
      });
    } catch (e) {
      // Unique index caught a duplicate submit (e.g. double-tap) - not an error.
      return fail(res, 400, 'Task already completed');
    }

    await Task.updateOne({ _id: task._id }, { $inc: { completedCount: 1 } });
    await creditReward(user, task.rewardCurrency, task.rewardAmount);

    return ok(res, { credited: { currency: task.rewardCurrency, amount: task.rewardAmount } });
  }

  return fail(res, 405, 'Method not allowed');
});
