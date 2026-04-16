// =====================================================
// TEST SERIES (PAPER) MODEL
// Phase 1.2 — Added isPublished, version, shuffleQuestions, questionPool
// =====================================================

const mongoose = require("mongoose");

const testSeriesSchema = new mongoose.Schema({

  // Title of the test
  title: { 
    type: String, 
    required: true 
  },

  description: String,
  duration: Number,
  price: Number,
  totalQuestions: Number,
  category: String,

  // Reference to the Series this paper belongs to
  seriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuizSeries",
    required: false
  },

  paperNumber: Number,

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },

  tags: [String],

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  // === QUIZ BEHAVIOUR CONTROLS ===

  // Shuffle answer options per attempt
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  // Shuffle question order per attempt 🔥
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  // Per-question time limit in seconds (0 = no limit)
  questionTimer: {
    type: Number,
    default: 0
  },
  // Draw N random questions from pool (0 = use all)
  questionPool: {
    type: Number,
    default: 0
  },

  // === PUBLISH & VERSION CONTROLS === 🔥
  isPublished: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  }

}, { timestamps: true });

module.exports = mongoose.model("TestSeries", testSeriesSchema);