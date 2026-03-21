const Joi = require("joi");

const addQuestionSchema = Joi.object({
  questionText: Joi.string().required(),

  options: Joi.array()
    .items(
      Joi.object({
        text: Joi.string().required()
      })
    )
    .min(2)
    .required(),

  correctOption: Joi.number().min(0).required(),

  explanation: Joi.string().optional()
});

module.exports = { addQuestionSchema };