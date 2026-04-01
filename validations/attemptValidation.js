// =====================================================
// SUBMIT TEST VALIDATION SCHEMA (Joi)
// Validates user answers and time taken for a test
// =====================================================

const Joi = require("joi");

// Schema for submitting a test
const submitTestSchema = Joi.object({

  // Array of answers submitted by user
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),        // ID of the question
        selectedOption: Joi.number().min(0).max(3).required() // selected option index (0–3)
      })
    )
    .min(1)      // At least one answer required
    .required(),

  // Optional time taken to complete test
  timeTaken: Joi.number().optional()
});

// =====================================================
// EXPORT SCHEMA
// =====================================================
module.exports = { submitTestSchema };