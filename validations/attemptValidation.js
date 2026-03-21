const Joi = require("joi");

const submitTestSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        selectedOption: Joi.number().min(0).max(3).required()
      })
    )
    .min(1)
    .required(),

  timeTaken: Joi.number().optional()
});

module.exports = { submitTestSchema };