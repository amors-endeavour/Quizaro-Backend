const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TestSeries", 
    required: true 
  },
  questionText: { 
    type: String, 
    required: true 
  },
  imageUrl: {
    type: String,
    default: null
  },
  options: [{ 
    text: String
  }],
  correctOption: { 
    type: Number, 
    required: false,
    default: 0
  },
  explanation: String,
  hint: {
    type: String,
    default: null
  },
  marks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0.25
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },
  section: {
    type: String,
    default: "General"
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagCount: {
    type: Number,
    default: 0
  },
  orderIndex: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Performance Indexes 🔥
questionSchema.index({ testId: 1 });
questionSchema.index({ orderIndex: 1 });

module.exports = mongoose.model("Question", questionSchema);