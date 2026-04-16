const mongoose = require("mongoose");

// Define schema for quiz series (e.g., "Math Basics")
const quizSeriesSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    unique: true
  },
  description: String,
  category: {
    type: String,
    default: "General"
  },

  // Visibility & Publish Controls 🔥
  isPublished: {
    type: Boolean,
    default: false
  },

  // Cover image (Cloudinary URL)
  coverImage: {
    type: String,
    default: null
  },

  // Difficulty level
  difficulty: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Intermediate"
  },

  // Manual sorting order
  sortOrder: {
    type: Number,
    default: 0
  },

  // Clone tracking
  clonedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuizSeries",
    default: null
  },

  // Version for update management
  version: {
    type: Number,
    default: 1
  },

  tags: [String],
  isFinite: {
    type: Boolean,
    default: false
  },
  maxPapers: {
    type: Number,
    default: 0
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { timestamps: true });

module.exports = mongoose.model("QuizSeries", quizSeriesSchema);
