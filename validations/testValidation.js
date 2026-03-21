const Joi = require("joi");

const createTestSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  duration: Joi.number().optional(),
  price: Joi.number().required(),
  totalQuestions: Joi.number().optional()
});

module.exports = { createTestSchema };