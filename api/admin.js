const { connectDB } = require('../lib/db');
const { authenticateRequest, isAdmin } = require('../lib/auth');
const { ok, fail, withErrorHandling, readJsonBody, getQuery } = require('../lib/respond');
const { isBotAdminInChat, sendMessage } = require('../lib/telegram');
const User = require('../models/User');
const Task = require('../models/Task');
const Broadcast = require('../models/Broadcast');

// Every non-admin gets a plain 404, with no hint that this endpoint exists.
function requireAdminOr404(telegramId, res) {
  if (!isAdmin(telegramId)) {
    fail(res, 404, 'Not found');
    return false;
  }
  return true;
}

module.exports = withErrorHandling(async (req, res) => {
  await connectDB();
  const { telegramId } = authenticateRequest(req);
  if (!requireAdminOr404(telegramId, res)) return;

  if (req.method === 'GET') {
    const query = getQuery(req);

    if (query.action === 'check-user') {
      if (!query.telegramId) return fail(res, 400, 'telegramId required');
      const user = await User.findOne({ telegramId: query.telegramId }).lean();
      if (!user) return fail(res, 404, 'User not found');
      return ok(res, { user });
    }

    if (query.action === 'verify-chat-admin') {
      if (!query.chatUsername) return fail(res, 400, 'chatUsername required');
      const botIsAdmin = await isBotAdminInChat(query.chatUsername);
      return ok(res, { botIsAdmin });
    }

    if (query.action === 'list-tasks') {
      const tasks = await Task.find({}).sort({ createdAt: -1 }).limit(200).lean();
      return ok(res, { tasks });
    }

    return fail(res, 400, 'Unknown action');
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);

    if (body.action === 'add-task') {
      const {
        section, type, title, subtitle, icon,
        targetChatUsername, targetUrl,
        adNetwork, adDailyLimit, hiddenFromEveryone,
        rewardCurrency, rewardAmount, completionCap,
      } = body;

      if (!['daily', 'social', 'exclusive', 'partner'].includes(section)) return fail(res, 400, 'Invalid section');
      if (!['ad', 'channel_group', 'bot_website'].includes(type)) return fail(res, 400, 'Invalid type');
      if (!title || !rewardAmount) return fail(res, 400, 'title and rewardAmount required');

      if (type === 'channel_group') {
        if (!targetChatUsername) return fail(res, 400, 'targetChatUsername required for channel/group tasks');
        const botIsAdmin = await isBotAdminInChat(targetChatUsername);
        if (!botIsAdmin) {
          return fail(res, 400, 'Add the bot as admin in this channel/group to continue');
        }
      }
      if (type === 'bot_website' && !targetUrl) {
        return fail(res, 400, 'targetUrl required for bot/website tasks');
      }

      const task = await Task.create({
        section, type, title, subtitle: subtitle || '', icon: icon || '',
        targetChatUsername: targetChatUsername || '',
        targetUrl: targetUrl || '',
        adNetwork: adNetwork || '',
        adDailyLimit: adDailyLimit || 10,
        hiddenFromEveryone: !!hiddenFromEveryone,
        rewardCurrency: rewardCurrency || 'gems',
        rewardAmount: Number(rewardAmount),
        completionCap: Number(completionCap) || 0,
        active: true,
        createdByAdminId: telegramId,
      });

      return ok(res, { task });
    }

    if (body.action === 'add-user-balance') {
      const { telegramId: targetId, currency, amount } = body;
      if (!targetId || !currency || !amount) return fail(res, 400, 'telegramId, currency, amount required');
      if (!['usdt', 'gems', 'spins', 'keys', 'diamond'].includes(currency)) return fail(res, 400, 'Invalid currency');

      const user = await User.findOneAndUpdate(
        { telegramId: String(targetId) },
        { $inc: { [`balances.${currency}`]: Number(amount) } },
        { new: true }
      );
      if (!user) return fail(res, 404, 'User not found');

      return ok(res, { balances: user.balances });
    }

    if (body.action === 'toggle-task') {
      const { taskId, active } = body;
      const task = await Task.findByIdAndUpdate(taskId, { active: !!active }, { new: true });
      if (!task) return fail(res, 404, 'Task not found');
      return ok(res, { task });
    }

    if (body.action === 'broadcast') {
      const { message } = body;
      if (!message) return fail(res, 400, 'message required');

      const broadcast = await Broadcast.create({ message, sentByAdminId: telegramId, status: 'sending' });
      const users = await User.find({ isBanned: false }).select('telegramId').lean();

      let success = 0, failed = 0;
      for (const u of users) {
        try {
          const result = await sendMessage(u.telegramId, message);
          if (result.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }

      broadcast.targetCount = users.length;
      broadcast.successCount = success;
      broadcast.failCount = failed;
      broadcast.status = 'done';
      await broadcast.save();

      return ok(res, { targetCount: users.length, successCount: success, failCount: failed });
    }

    return fail(res, 400, 'Unknown action');
  }

  return fail(res, 405, 'Method not allowed');
});
