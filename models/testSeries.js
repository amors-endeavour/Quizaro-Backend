// =====================================================
// TEST SERIES MODEL
// Stores metadata for each test/quiz
// Each test can contain multiple questions
// =====================================================

const mongoose = require("mongoose");

// Define schema for test series
const testSeriesSchema = new mongoose.Schema({

  // Title of the test
  title: { 
    type: String, 
    required: true 
  },

  // Short description about the test
  description: String,

  // Duration of test in minutes
  duration: Number,

  // Price of the test (0 means free test)
  price: Number,

  // Total number of questions in the test
  totalQuestions: Number,

  // Reference to admin/user who created the test
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

}, { timestamps: true }); // Adds createdAt & updatedAt automatically

// =====================================================
// EXPORT MODEL
// =====================================================
module.exports =  mongoose.model("TestSeries", testSeriesSchema);