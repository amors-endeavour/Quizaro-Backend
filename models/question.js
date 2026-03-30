// =====================================================
// QUESTIONS MODEL
// Stores question text, options, correct answer index,
// and explanation for each question
// =====================================================

import mongoose from "mongoose";

// Define schema for questions
const questionSchema = new mongoose.Schema({

  // Reference to the test this question belongs to
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TestSeries", 
    required: true 
  },

  // Main question text
  questionText: { 
    type: String, 
    required: true 
  },

  // Array of options for the question
  options: [
    { 
      text: String   // option text
    }
  ],

  // Index of the correct option (0-based index)
  correctOption: { 
    type: Number, 
    required: true 
  },

  // Explanation shown after test submission
  explanation: String,

}, { timestamps: true }); // Adds createdAt & updatedAt automatically

// =====================================================
// EXPORT MODEL
// =====================================================
export default mongoose.model("Question", questionSchema);