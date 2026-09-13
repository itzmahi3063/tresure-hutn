import crypto from "crypto";

/**
 * Verifies Telegram WebApp `initData` server-side.
 * Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the parsed, verified user object, or null if the signature is invalid
 * (invalid = reject the request; never fall back to trusting client-supplied fields).
 */
export function verifyTelegramInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) return null;

  // Optional: reject stale initData (e.g. older than 24h)
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  const userRaw = params.get("user");
  return userRaw ? JSON.parse(userRaw) : null;
}
