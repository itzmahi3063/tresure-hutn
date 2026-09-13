import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: String,
    firstName: String,
    photoUrl: String,

    diamondBalance: { type: Number, default: 0 },
    usdtBalance: { type: Number, default: 0 },

    referredBy: { type: String, default: null }, // telegramId of referrer
    referralValid: { type: Boolean, default: false }, // 5 tasks + 20 ads done

    tasksCompleted: { type: Number, default: 0 },
    adsWatched: { type: Number, default: 0 },

    completedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    completedAdSlots: [
      {
        adSlotId: String,
        watchedAt: Date,
      },
    ],

    isBanned: { type: Boolean, default: false }, // for anti-cheat enforcement
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
