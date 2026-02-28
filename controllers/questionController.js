const Question = require("../models/question")

// Add Unlimited Questions (Admin)
exports.addQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOption, explanation } = req.body

    const question = await Question.create({
      testId: req.params.testId,
      questionText,
      options,
      correctOption,
      explanation
    })

    res.status(201).json(question)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Get Questions for Attempt (Hide correct answer)
exports.getTestQuestions = async (req, res) => {
  const questions = await Question.find({ testId: req.params.testId })
    .select("-correctOption -explanation")

  res.json(questions)
}