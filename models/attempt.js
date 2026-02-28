//User Test Submissions : This stores the answers submitted by a user, including whether they were correct, plus score and ranking metadata.

const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "TestSeries", required: true },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      selectedOption: Number, // index user chose
      correctOption: Number,
      isCorrect: Boolean,
      explanation: String
    }
  ],
  score: Number,
  percentage: Number,
  timeTaken: Number,
}, { timestamps: true });

module.exports = mongoose.model("Attempt", attemptSchema);