// =====================================================
// QUESTIONS MODEL
// Phase 1.3 — Added hint, imageUrl, flag tracking, orderIndex
// =====================================================

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({

  // Reference to the test this question belongs to
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TestSeries", 
    required: true 
  },

  // Main question text (supports markdown/HTML)
  questionText: { 
    type: String, 
    required: true 
  },

  // Optional question image (Cloudinary URL) 🔥
  imageUrl: {
    type: String,
    default: null
  },

  // Array of options for the question
  options: [{ 
    text: String
  }],

  // Index of the correct option (0-based)
  correctOption: { 
    type: Number, 
    required: true 
  },

  // Explanation shown after test submission
  explanation: String,

  // Hint shown on-request during quiz 🔥
  hint: {
    type: String,
    default: null
  },

  // Scoring
  marks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0.25
  },

  // Difficulty level
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },

  // Taxonomic Section 🔥
  section: {
    type: String,
    default: "General"
  },

  // User flagging for admin review 🔥
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagCount: {
    type: Number,
    default: 0
  },

  // Display order within test (for non-shuffled mode)
  orderIndex: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);