// =====================================================
// USER TEST SUBMISSIONS MODEL
// Stores answers submitted by a user, along with
// score, correctness, and ranking-related data
// =====================================================

const mongoose = require("mongoose");

// Define schema for attempt
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
      // Reference to question
      questionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Question" 
      },

      selectedOption: Number, // index chosen by user
      correctOption: Number,  // correct answer index
      isCorrect: Boolean,     // whether answer is correct
      explanation: String     // explanation for answer
    }
  ],

  // Total score obtained
  score: Number,

  // Percentage score
  percentage: Number,

  // Time taken to complete test
  timeTaken: Number,

}, { timestamps: true }); // Automatically adds createdAt & updatedAt

// =====================================================
// EXPORT MODEL
// =====================================================
module.exports = mongoose.model("Attempt", attemptSchema);