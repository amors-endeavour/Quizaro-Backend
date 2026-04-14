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

      const question = questions.find(
        q => q._id.toString() === ans.questionId
      );
      
      if (!question) {
        return next(new AppError("Question not found", 400));
      }

      if (ans.selectedOption < 0 || ans.selectedOption >= question.options.length) {
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
   LEADERBOARD (PER TEST)
=========================================== */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const attempts = await Attempt.find({ testId })
      .populate("userId", "name")
      .sort({ score: -1, timeTaken: 1 });

    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      user: attempt.userId?.name || "Anonymous",
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
   GLOBAL LEADERBOARD
=========================================== */
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    // Get top 10 unique users by their highest percentage
    const leaderboard = await Attempt.aggregate([
      { $sort: { percentage: -1, timeTaken: 1 } },
      {
        $group: {
          _id: "$userId",
          topPercentage: { $first: "$percentage" },
          name: { $first: "$userId" } // We'll populate this manually or via subsequent lookup
        }
      },
      { $sort: { topPercentage: -1 } },
      { $limit: 10 }
    ]);

    // Populate user names
    const populatedLeaderboard = await Promise.all(
      leaderboard.map(async (entry, index) => {
        const user = await User.findById(entry._id).select("name");
        return {
          rank: index + 1,
          name: user?.name || "Anonymous",
          score: entry.topPercentage
        };
      })
    );

    // Calculate current user's rank if authenticated
    let userRank = null;
    let userScore = null;
    let percentile = 0;

    if (req.user && req.user.id) {
      // Find user's best attempt
      const bestAttempt = await Attempt.findOne({ userId: req.user.id })
        .sort({ percentage: -1, timeTaken: 1 });
      
      if (bestAttempt) {
        userScore = bestAttempt.percentage;
        // Count users with higher best score
        const betterUsers = await Attempt.aggregate([
          { $group: { _id: "$userId", best: { $max: "$percentage" } } },
          { $match: { best: { $gt: userScore } } },
          { $count: "count" }
        ]);
        userRank = (betterUsers[0]?.count || 0) + 1;

        // Calculate percentile
        const totalUsersCount = await User.countDocuments({ role: "student" });
        if (totalUsersCount > 0) {
          percentile = Math.round(((totalUsersCount - userRank + 1) / totalUsersCount) * 100);
        }
      }
    }

    res.json({
      leaderboard: populatedLeaderboard,
      userRank,
      userScore,
      percentile
    });
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
      .populate("testId", "title category");

    res.json(attempts);

  } catch (err) {
    next(err);
  }
};