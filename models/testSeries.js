//Test / Quiz Metadata : Each test series can contain unlimited questions.

const mongoose = require("mongoose");

const testSeriesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  duration: Number,     // in minutes
  price: Number,        // 0 for free
  totalQuestions: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("TestSeries", testSeriesSchema);