//Questions with Options + Explanation : This holds question text, options, explanation, and correct answer index.

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "TestSeries", required: true },
  questionText: { type: String, required: true },
  options: [
    { text: String }
  ],
  correctOption: { type: Number, required: true }, // index of correct option
  explanation: String, // explanation after test submit
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);