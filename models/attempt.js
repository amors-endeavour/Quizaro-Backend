const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TestSeries", 
    required: true 
  },
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
  score: Number,
  percentage: Number,
  timeTaken: Number,
  isRetake: {
    type: Boolean,
    default: false
  },
  retakeNumber: {
    type: Number,
    default: 1
  },
  questionOrder: [mongoose.Schema.Types.ObjectId],
}, { timestamps: true });

// Performance Indexes 🔥
attemptSchema.index({ userId: 1 });
attemptSchema.index({ testId: 1 });
attemptSchema.index({ percentage: -1 });

module.exports = mongoose.model("Attempt", attemptSchema);