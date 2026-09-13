import { connectDB } from "../../lib/mongodb.js";
import { requireAdmin } from "../../lib/adminGuard.js";
import Task from "../../models/Task.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(404).end(); // looks like the route doesn't exist

  if (req.method !== "POST") return res.status(405).end();

  await connectDB();

  const {
    section, // "daily" | "social" | "exclusive" | "partner"
    type, // "channel_group" | "bot_website"
    title,
    imageUrl,
    url,
    chatUsername,
    rewardDiamonds,
    completionCap,
  } = req.body;

  if (!section || !type || !title || !rewardDiamonds) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const task = await Task.create({
    section,
    type,
    title,
    imageUrl,
    url,
    chatUsername,
    rewardDiamonds,
    completionCap: completionCap || null,
    isPublished: false, // admin publishes separately, or set true here if "Publish" = create
    createdBy: String(admin.id),
  });

  res.status(200).json({ ok: true, task });
}
