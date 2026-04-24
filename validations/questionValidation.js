// =====================================================
// ADD QUESTION VALIDATION SCHEMA (Joi)
// Validates question creation input
// =====================================================

const Joi = require("joi");

// Schema for adding a question
const addQuestionSchema = Joi.object({
  questionText: Joi.string().required(),
  options: Joi.array().items(Joi.object({ text: Joi.string().required() })).min(2).required(),
  correctOption: Joi.number().min(0).required(),
  explanation: Joi.string().optional().allow(""),
  points: Joi.number().optional(), // Support 'points' from frontend
  marks: Joi.number().optional(),  // Support 'marks' from backend
  negativeMarks: Joi.number().optional().default(0.25),
  difficulty: Joi.string().valid("Easy", "Medium", "Hard").optional().default("Medium"),
  section: Joi.string().optional().default("General") // Support 'section'
}).unknown(true); // Allow extra fields to prevent failures

// =====================================================
// EXPORT SCHEMA
// =====================================================
module.exports =  { addQuestionSchema };