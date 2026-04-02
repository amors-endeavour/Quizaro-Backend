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
        questionId: Joi.string().required(),
        selectedOption: Joi.number().min(0).required()
      })
    )
    .min(1)
    .required(),

  timeTaken: Joi.number().optional()
});

// =====================================================
// EXPORT SCHEMA
// =====================================================
module.exports = { submitTestSchema };