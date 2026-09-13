import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["daily", "social", "exclusive", "partner"],
      required: true,
    },
    type: { type: String, enum: ["channel_group", "bot_website"], required: true },

    title: { type: String, required: true },
    imageUrl: String,
    url: String, // bot/website link, or the @username for channel/group

    chatUsername: String, // required if type === channel_group, used for getChatMember check

    rewardDiamonds: { type: Number, required: true },
    completionCap: { type: Number, default: null }, // null = unlimited
    completions: { type: Number, default: 0 },

    isPublished: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false }, // admin can hide without deleting

    createdBy: String, // admin telegramId
  },
  { timestamps: true }
);

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
