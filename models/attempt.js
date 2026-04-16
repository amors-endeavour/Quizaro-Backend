// =====================================================
// USER TEST SUBMISSIONS MODEL
// Phase 1.4 — Added retake tracking and question order
// =====================================================

const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({

  // Reference to the user who attempted the test
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  // Reference to the test
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TestSeries", 
    required: true 
  },

  // Array of answers submitted by user
  answers: [
    {
      questionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Question" 
      },
      questionText: String,
      options: [{ text: String }],
      selectedOption: Number,
      correctOption: Number,
      isCorrect: Boolean,
      explanation: String
    }
  ],

  // Scores
  score: Number,
  percentage: Number,
  timeTaken: Number,

  // Retake tracking 🔥
  isRetake: {
    type: Boolean,
    default: false
  },
  retakeNumber: {
    type: Number,
    default: 1
  },

  // The shuffled question order used in this specific attempt 🔥
  questionOrder: [mongoose.Schema.Types.ObjectId],

}, { timestamps: true });

module.exports = mongoose.model("Attempt", attemptSchema);