import mongoose from "mongoose";

const AdSlotSchema = new mongoose.Schema(
  {
    network: { type: String, required: true }, // "adsgram" | "monetag" | ...
    label: String,
    imageUrl: String,

    rewardDiamonds: { type: Number, required: true },
    dailyCapPerUser: { type: Number, default: 10 },

    isHidden: { type: Boolean, default: false }, // admin toggle, hides row for everyone
  },
  { timestamps: true }
);

export default mongoose.models.AdSlot || mongoose.model("AdSlot", AdSlotSchema);
