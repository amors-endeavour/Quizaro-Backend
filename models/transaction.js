const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "TestSeries" },
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "QuizSeries" },
  orderId: { type: String, required: true }, // Razorpay Order ID
  paymentId: String, // Razorpay Payment ID (after verification)
  signature: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { 
    type: String, 
    enum: ["pending", "completed", "failed"], 
    default: "pending" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
