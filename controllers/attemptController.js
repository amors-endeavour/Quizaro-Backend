const Attempt = require("../models/attempt")
const Question = require("../models/question")
const TestSeries = require("../models/testSeries")


/* ===========================================
   SUBMIT TEST
=========================================== */

exports.submitTest = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body
    const testId = req.params.testId
    const userId = req.user.id

    // Optional: Prevent multiple attempts
    const alreadyAttempted = await Attempt.findOne({ userId, testId })
    if (alreadyAttempted) {
      return res.status(400).json({ message: "You have already attempted this test." })
    }

    const questions = await Question.find({ testId })

    if (!questions.length) {
      return res.status(400).json({ message: "No questions found for this test." })
    }

    let score = 0
    let resultAnswers = []

    for (let userAnswer of answers) {
      const question = questions.find(
        q => q._id.toString() === userAnswer.questionId
      )

      if (!question) continue

      const isCorrect = question.correctOption === userAnswer.selectedOption

      if (isCorrect) score++

      resultAnswers.push({
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: userAnswer.selectedOption,
        correctOption: question.correctOption,
        isCorrect,
        explanation: question.explanation
      })
    }

    const percentage = ((score / questions.length) * 100).toFixed(2)

    const attempt = await Attempt.create({
      userId,
      testId,
      answers: resultAnswers,
      score,
      percentage,
      timeTaken
    })

    // Calculate Rank
    const betterScores = await Attempt.countDocuments({
      testId,
      $or: [
        { score: { $gt: score } },
        {
          score: score,
          timeTaken: { $lt: timeTaken }
        }
      ]
    })

    const rank = betterScores + 1

    res.status(201).json({
      message: "Test submitted successfully",
      attemptId: attempt._id,
      score,
      percentage,
      rank,
      answers: resultAnswers
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


/* ===========================================
   GET RESULT (FULL DETAILS)
=========================================== */

exports.getResult = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate("userId", "name email")
      .populate("testId", "title")

    if (!attempt) {
      return res.status(404).json({ message: "Result not found" })
    }

    res.json(attempt)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


/* ===========================================
   LEADERBOARD
=========================================== */

exports.getLeaderboard = async (req, res) => {
  try {
    const testId = req.params.testId

    const attempts = await Attempt.find({ testId })
      .populate("userId", "name")
      .sort({ score: -1, timeTaken: 1 })

    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      user: attempt.userId.name,
      score: attempt.score,
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken
    }))

    res.json(leaderboard)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}