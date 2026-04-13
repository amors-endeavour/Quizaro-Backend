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
