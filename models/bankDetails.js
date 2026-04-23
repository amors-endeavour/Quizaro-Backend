const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema({
  accountHolder: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankName: { type: String, required: true },
  upiId: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("BankDetails", bankDetailsSchema);
