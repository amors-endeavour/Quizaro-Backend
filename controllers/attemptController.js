const Attempt = require("../models/attempt");
const Question = require("../models/question");

/* ===========================================
   SUBMIT TEST
   - User submits answers
   - Backend calculates score
   - Stores attempt
   - Returns result + rank
=========================================== */

exports.submitTest = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const testId = req.params.testId;
    const userId = req.user.id;

    // ❌ Prevent multiple attempts for same test
    const alreadyAttempted = await Attempt.findOne({ userId, testId });
    if (alreadyAttempted) {
      return res.status(400).json({
        message: "You have already attempted this test."
      });
    }

    // Fetch all questions for this test
    const questions = await Question.find({ testId });

    if (!questions.length) {
      return res.status(400).json({
        message: "No questions found for this test."
      });
    }

    let score = 0;
    let resultAnswers = [];

    // 🔍 Evaluate each answer
    for (let userAnswer of answers) {

      // Find matching question
      const question = questions.find(
        q => q._id.toString() === userAnswer.questionId
      );

      if (!question) continue;

      // Check correctness
      const isCorrect =
        question.correctOption === userAnswer.selectedOption;

      if (isCorrect) score++;

      // Store detailed answer result
      resultAnswers.push({
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: userAnswer.selectedOption,
        correctOption: question.correctOption,
        isCorrect,
        explanation: question.explanation
      });
    }

    // 📊 Calculate percentage
    const percentage = ((score / questions.length) * 100).toFixed(2);

    // 💾 Save attempt in DB
    const attempt = await Attempt.create({
      userId,
      testId,
      answers: resultAnswers,
      score,
      percentage,
      timeTaken
    });

    /* ===========================================
       RANK CALCULATION
       - Higher score = better rank
       - If score same → less time wins
    =========================================== */

    const betterScores = await Attempt.countDocuments({
      testId,
      $or: [
        { score: { $gt: score } },
        { score: score, timeTaken: { $lt: timeTaken } }
      ]
    });

    const rank = betterScores + 1;

    // 📤 Response
    res.status(201).json({
      message: "Test submitted successfully",
      attemptId: attempt._id,
      score,
      percentage,
      rank,
      answers: resultAnswers
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET RESULT
   - Returns full attempt details
=========================================== */

exports.getResult = async (req, res) => {
  try {

    const attempt = await Attempt.findById(req.params.attemptId)
      .populate("userId", "name email")
      .populate("testId", "title");

    if (!attempt) {
      return res.status(404).json({
        message: "Result not found"
      });
    }

    res.json(attempt);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   LEADERBOARD
   - Sorted by score DESC
   - Tie-breaker: time ASC
=========================================== */

exports.getLeaderboard = async (req, res) => {
  try {

    const testId = req.params.testId;

    const attempts = await Attempt.find({ testId })
      .populate("userId", "name")
      .sort({ score: -1, timeTaken: 1 });

    // Format leaderboard response
    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      user: attempt.userId.name,
      score: attempt.score,
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken
    }));

    res.json(leaderboard);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};