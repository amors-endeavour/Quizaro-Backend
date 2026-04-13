// =====================================================
// CREATE TEST VALIDATION SCHEMA (Joi)
// Validates input data for creating a test series
// =====================================================

const Joi = require("joi");

// Schema for creating a test
const createTestSchema = Joi.object({

  // Title of the test (required)
  title: Joi.string().required(),

  // Optional description of the test
  description: Joi.string().optional(),

  // Duration of test in minutes (optional)
  duration: Joi.number().optional(),

  // Price of the test (required, can be 0 for free tests)
  price: Joi.number().required(),

  // Total number of questions (optional)
  totalQuestions: Joi.number().optional(),

  // Category for folder-based organization
  category: Joi.string().optional(),

  // Hierarchical fields
  seriesId: Joi.string().allow("").optional(),
  paperNumber: Joi.number().optional(),
  difficulty: Joi.string().valid("Easy", "Medium", "Hard").optional()
});

// =====================================================
// EXPORT SCHEMA
// =====================================================
module.exports = { createTestSchema };