import { connectDB } from "../../lib/mongodb.js";
import { verifyTelegramInitData } from "../../lib/telegramAuth.js";
import User from "../../models/User.js";

export default async function handler(req, res) {
  const initData = req.headers["x-telegram-init-data"];
  const tgUser = verifyTelegramInitData(initData);

  if (!tgUser) return res.status(401).json({ error: "Invalid session" });

  await connectDB();

  let user = await User.findOne({ telegramId: String(tgUser.id) });
  if (!user) {
    // First-ever open: create with real Telegram identity, balances at 0
    user = await User.create({
      telegramId: String(tgUser.id),
      username: tgUser.username,
      firstName: tgUser.first_name,
      photoUrl: tgUser.photo_url,
    });
  }

  res.status(200).json({
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    diamondBalance: user.diamondBalance,
    usdtBalance: user.usdtBalance,
  });
}
