const { connectDB } = require('../lib/db');
const { verifyInitData, signSession, isAdmin } = require('../lib/auth');
const { ok, fail, withErrorHandling, readJsonBody } = require('../lib/respond');
const User = require('../models/User');

module.exports = withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  await connectDB();
  const body = await readJsonBody(req);
  const { initData } = body;

  // Source of truth for identity: the HMAC-verified Telegram payload, never
  // anything the client claims about itself in the JSON body.
  const { user: tgUser, startParam } = verifyInitData(initData, process.env.BOT_TOKEN);

  let user = await User.findOne({ telegramId: String(tgUser.id) });

  if (!user) {
    let referredBy = null;
    if (startParam && startParam.startsWith('ref_')) {
      const refTelegramId = startParam.slice(4);
      const referrer = await User.findOne({ telegramId: refTelegramId });
      if (referrer && String(referrer.telegramId) !== String(tgUser.id)) {
        referredBy = referrer._id;
      }
    }

    user = await User.create({
      telegramId: String(tgUser.id),
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || '',
      username: tgUser.username || '',
      photoUrl: tgUser.photo_url || '',
      referredBy,
    });

    if (referredBy) {
      await User.updateOne({ _id: referredBy }, { $inc: { 'referralStats.totalReferrals': 1 } });
    }
  } else {
    // Keep name/photo/username fresh from Telegram on every login - never
    // let the client set these directly.
    user.firstName = tgUser.first_name || user.firstName;
    user.lastName = tgUser.last_name || user.lastName;
    user.username = tgUser.username || user.username;
    user.photoUrl = tgUser.photo_url || user.photoUrl;
    await user.save();
  }

  const session = signSession({ telegramId: user.telegramId });

  ok(res, {
    session,
    isAdmin: isAdmin(user.telegramId),
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
      balances: user.balances,
    },
  });
});
