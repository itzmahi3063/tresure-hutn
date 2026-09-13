import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "diamondToUsdtRate"
  value: mongoose.Schema.Types.Mixed,
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
