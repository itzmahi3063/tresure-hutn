import { connectDB } from "../lib/mongodb.js";
import { verifyTelegramInitData } from "../lib/telegramAuth.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const tgUser = verifyTelegramInitData(req.headers["x-telegram-init-data"]);
  if (!tgUser) return res.status(401).json({ error: "Invalid session" });

  await connectDB();

  const { diamondAmount } = req.body;
  const user = await User.findOne({ telegramId: String(tgUser.id) });

  if (!user || user.isBanned) return res.status(403).json({ error: "Not allowed" });
  if (!diamondAmount || diamondAmount <= 0 || diamondAmount > user.diamondBalance) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const rateSetting = await Settings.findOne({ key: "diamondToUsdtRate" });
  const rate = rateSetting?.value ?? Number(process.env.DIAMOND_TO_USDT_RATE) ?? 0.00004;

  user.diamondBalance -= diamondAmount;
  user.usdtBalance += diamondAmount * rate;
  await user.save();

  res.status(200).json({
    ok: true,
    diamondBalance: user.diamondBalance,
    usdtBalance: user.usdtBalance,
    rate,
  });
}
