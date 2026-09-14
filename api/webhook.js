const { connectDB } = require('../lib/db');
const { ok, fail, withErrorHandling, readJsonBody } = require('../lib/respond');
const { sendMessage } = require('../lib/telegram');

module.exports = withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  // Optional but recommended: set a secret path/token on the webhook URL itself
  // (Telegram supports a secret_token header) and check it here before trusting the body.
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET && secretHeader !== process.env.WEBHOOK_SECRET) {
    return fail(res, 401, 'Invalid webhook secret');
  }

  await connectDB();
  const update = await readJsonBody(req);
  const message = update.message;

  if (message && message.text && message.text.startsWith('/start')) {
    const appUrl = process.env.APP_URL;
    await sendMessage(
      message.chat.id,
      `\u2694\ufe0f <b>Welcome to Treasure Hunt!</b>\n\nOpen the app below to start digging for treasure, complete tasks, and earn real rewards.\n\n<a href="${appUrl}">Open Treasure Hunt</a>`
    );
  }

  ok(res, {});
});
