// =====================================================
// ADD QUESTION VALIDATION SCHEMA (Joi)
// Validates question creation input
// =====================================================

import Joi from "joi";

// Schema for adding a question
const addQuestionSchema = Joi.object({

  // Question text (required)
  questionText: Joi.string().required(),

  // Array of options (minimum 2 required)
  options: Joi.array()
    .items(
      Joi.object({
        text: Joi.string().required()   // option text
      })
    )
    .min(2)
    .required(),

  // Index of correct option (0-based index)
  correctOption: Joi.number().min(0).required(),

  // Optional explanation (shown after test submission)
  explanation: Joi.string().optional()
});

// =====================================================
// EXPORT SCHEMA
// =====================================================
export { addQuestionSchema };