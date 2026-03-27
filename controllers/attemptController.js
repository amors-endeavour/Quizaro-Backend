const Attempt = require("../models/attempt");
const Question = require("../models/question");
const User = require("../models/user");
const AppError = require("../utils/AppError");

/* ===========================================
   SUBMIT TEST
=========================================== */
exports.submitTest = async (req, res, next) => {
  try {
    const { answers, timeTaken } = req.body;
    const testId = req.params.testId;
    const userId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return next(new AppError("Answers are required", 400));
    }

    const user = await User.findById(userId);

    const purchasedTest = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    if (!purchasedTest) {
      return next(new AppError("You have not purchased this test", 403));
    }

    if (purchasedTest.isCompleted) {
      return next(new AppError("You have already attempted this test", 400));
    }

    if (new Date() > purchasedTest.expiresAt) {
      return next(new AppError("Test expired", 403));
    }

    const alreadyAttempted = await Attempt.findOne({ userId, testId });
    if (alreadyAttempted) {
      return next(new AppError("You have already attempted this test", 400));
    }

    const questions = await Question.find({ testId });

    if (!questions.length) {
      return next(new AppError("No questions found for this test", 400));
    }

    if (answers.length !== questions.length) {
      return next(new AppError("All questions must be answered", 400));
    }

    const questionIds = answers.map(a => a.questionId);
    const uniqueIds = new Set(questionIds);

    if (uniqueIds.size !== questionIds.length) {
      return next(new AppError("Duplicate questionIds found", 400));
    }

    const validQuestionIds = questions.map(q => q._id.toString());

    for (let ans of answers) {
      if (!validQuestionIds.includes(ans.questionId)) {
        return next(new AppError("Invalid questionId or question not in this test", 400));
      }

      if (ans.selectedOption < 0 || ans.selectedOption > 3) {
        return next(new AppError("Invalid selected option", 400));
      }
    }

    let score = 0;
    let resultAnswers = [];

    for (let userAnswer of answers) {
      const question = questions.find(
        q => q._id.toString() === userAnswer.questionId
      );

      const isCorrect =
        question.correctOption === userAnswer.selectedOption;

      if (isCorrect) score++;

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

    const percentage = ((score / questions.length) * 100).toFixed(2);

    const attempt = await Attempt.create({
      userId,
      testId,
      answers: resultAnswers,
      score,
      percentage,
      timeTaken
    });

    purchasedTest.isCompleted = true;
    await user.save();

    const betterScores = await Attempt.countDocuments({
      testId,
      $or: [
        { score: { $gt: score } },
        { score: score, timeTaken: { $lt: timeTaken } }
      ]
    });

    const rank = betterScores + 1;

    res.status(201).json({
      message: "Test submitted successfully",
      attemptId: attempt._id,
      score,
      percentage,
      rank,
      answers: resultAnswers
    });

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET RESULT
=========================================== */
exports.getResult = async (req, res, next) => {
  try {

    const attempt = await Attempt.findById(req.params.attemptId)
      .populate("userId", "name email")
      .populate("testId", "title");

    if (!attempt) {
      return next(new AppError("Result not found", 404));
    }

    res.json(attempt);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   LEADERBOARD
=========================================== */
exports.getLeaderboard = async (req, res, next) => {
  try {

    const testId = req.params.testId;

    const attempts = await Attempt.find({ testId })
      .populate("userId", "name")
      .sort({ score: -1, timeTaken: 1 });

    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      user: attempt.userId.name,
      score: attempt.score,
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken
    }));

    res.json(leaderboard);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET USER ATTEMPTS
=========================================== */
exports.getUserAttempts = async (req, res, next) => {
  try {

    const attempts = await Attempt.find({ userId: req.user.id })
      .populate("testId", "title");

    res.json(attempts);

  } catch (err) {
    next(err);
  }
};