import { connectDB } from "../lib/mongodb.js";
import { verifyTelegramInitData } from "../lib/telegramAuth.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const tgUser = verifyTelegramInitData(req.headers["x-telegram-init-data"]);
  if (!tgUser) return res.status(401).json({ error: "Invalid session" });

  await connectDB();

  const { amountUsdt, walletAddress } = req.body;
  const user = await User.findOne({ telegramId: String(tgUser.id) });

  if (!user || user.isBanned) return res.status(403).json({ error: "Not allowed" });
  if (!amountUsdt || amountUsdt <= 0 || amountUsdt > user.usdtBalance) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // Deduct immediately so the same balance can't be withdrawn twice in parallel requests
  user.usdtBalance -= amountUsdt;
  await user.save();

  const withdrawal = await Withdrawal.create({
    telegramId: user.telegramId,
    amountUsdt,
    walletAddress,
    status: "pending",
  });

  res.status(200).json({ ok: true, withdrawalId: withdrawal._id });
}
