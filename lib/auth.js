const crypto = require('crypto');

/**
 * Verifies Telegram WebApp initData per Telegram's spec:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Never trust a client-supplied user id/name directly - this HMAC check is the
 * only source of truth for "who is making this request".
 */
function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    throw new AuthError('Missing initData');
  }
  if (!botToken) {
    throw new AuthError('Server misconfigured: BOT_TOKEN missing');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new AuthError('initData missing hash');
  params.delete('hash');

  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new AuthError('initData signature invalid');
  }

  // auth_date freshness check - reject stale/replayed payloads (24h window)
  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) {
    throw new AuthError('initData expired');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new AuthError('initData missing user');
  const user = JSON.parse(userRaw);

  const startParam = params.get('start_param') || null;

  return { user, startParam, authDate };
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

/** Small HMAC-signed session token so we don't have to re-verify the full
 * initData payload on every single call from the client, while still never
 * trusting a bare client-supplied id. Issued only right after a successful
 * verifyInitData(). */
function signSession(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server misconfigured: JWT_SECRET missing');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server misconfigured: JWT_SECRET missing');
  if (!token || !token.includes('.')) throw new AuthError('Missing session token');
  const [body, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expectedSig) throw new AuthError('Invalid session token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (Date.now() - payload.iat > 1000 * 60 * 60 * 12) throw new AuthError('Session expired');
  return payload;
}

/** Reads either a session token (x-session header) or raw initData
 * (x-telegram-init-data header), verifies it, and returns { telegramId, tgUser }. */
function authenticateRequest(req) {
  const sessionHeader = req.headers['x-session'];
  if (sessionHeader) {
    const payload = verifySession(sessionHeader);
    return { telegramId: payload.telegramId, tgUser: null };
  }
  const initData = req.headers['x-telegram-init-data'];
  const { user } = verifyInitData(initData, process.env.BOT_TOKEN);
  return { telegramId: String(user.id), tgUser: user };
}

function isAdmin(telegramId) {
  return String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID || '');
}

module.exports = {
  verifyInitData,
  signSession,
  verifySession,
  authenticateRequest,
  isAdmin,
  AuthError,
};
