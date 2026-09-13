import { verifyTelegramInitData } from "./telegramAuth";

/**
 * Use at the top of any /api/admin/* handler AND when server-rendering
 * the /admin page. Anyone who isn't ADMIN_USER_ID gets treated as if
 * the route doesn't exist — no distinguishing error message.
 */
export function requireAdmin(req) {
  const initData = req.headers["x-telegram-init-data"];
  const user = verifyTelegramInitData(initData);

  if (!user || String(user.id) !== String(process.env.ADMIN_USER_ID)) {
    return null; // caller should respond as if the route doesn't exist
  }
  return user;
}
