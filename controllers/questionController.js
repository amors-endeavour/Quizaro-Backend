const Question = require("../models/question");

/* ===========================================
   ADD QUESTION (Admin Only)
   - Adds question to a test
=========================================== */

exports.addQuestion = async (req, res) => {
  try {

    const { questionText, options, correctOption, explanation } = req.body;

    const question = await Question.create({
      testId: req.params.testId,
      questionText,
      options,
      correctOption,
      explanation
    });

    res.status(201).json(question);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET QUESTIONS FOR TEST
   - Used when user starts test
   - Hides correct answers
=========================================== */

exports.getTestQuestions = async (req, res) => {

  const questions = await Question.find({ testId: req.params.testId })
    .select("-correctOption -explanation"); // 🔐 hide answers

  res.json(questions);
};