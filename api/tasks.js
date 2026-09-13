import { connectDB } from "../lib/mongodb.js";
import { verifyTelegramInitData } from "../lib/telegramAuth.js";
import Task from "../models/Task.js";

export default async function handler(req, res) {
  const tgUser = verifyTelegramInitData(req.headers["x-telegram-init-data"]);
  if (!tgUser) return res.status(401).json({ error: "Invalid session" });

  await connectDB();

  const section = req.query.section || "daily";
  const tasks = await Task.find({
    section,
    isPublished: true,
    isHidden: false,
  }).sort({ createdAt: -1 });

  res.status(200).json(tasks);
}
