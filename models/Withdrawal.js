import mongoose from "mongoose";

const WithdrawalSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, index: true },
    amountUsdt: { type: Number, required: true },
    walletAddress: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Withdrawal ||
  mongoose.model("Withdrawal", WithdrawalSchema);
