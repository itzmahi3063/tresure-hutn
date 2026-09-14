const { connectDB } = require('../lib/db');
const { authenticateRequest } = require('../lib/auth');
const { ok, fail, withErrorHandling } = require('../lib/respond');
const User = require('../models/User');

module.exports = withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  await connectDB();
  const { telegramId } = authenticateRequest(req);
  const user = await User.findOne({ telegramId });
  if (!user) return fail(res, 404, 'User not found');

  ok(res, {
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
    },
    balances: user.balances,
    referrals: user.referralStats.totalReferrals,
  });
});
