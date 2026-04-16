// =====================================================
// QUIZ ENGAGEMENT CONTROLLER 🔥
// Phase 2.1–2.5 — Hints, flags, retakes, series clone/publish
// =====================================================

const Question = require("../models/question");
const TestSeries = require("../models/testSeries");
const QuizSeries = require("../models/quizSeries");
const Attempt = require("../models/attempt");
const User = require("../models/user");
const AppError = require("../utils/AppError");

/* ===========================================
   GET HINT FOR A QUESTION
=========================================== */
exports.getHint = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.questionId).select("hint testId");
    if (!question) return next(new AppError("Question not found", 404));
    if (!question.hint) return res.json({ hint: null, message: "No hint available for this question." });
    res.json({ hint: question.hint });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   FLAG A QUESTION (User Report)
=========================================== */
exports.flagQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      { $inc: { flagCount: 1 }, $set: { isFlagged: true } },
      { new: true }
    );
    if (!question) return next(new AppError("Question not found", 404));
    res.json({ message: "Question reported for review. Thank you for your feedback.", flagCount: question.flagCount });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET FLAGGED QUESTIONS (Admin)
=========================================== */
exports.getFlaggedQuestions = async (req, res, next) => {
  try {
    const flagged = await Question.find({ isFlagged: true })
      .populate("testId", "title")
      .sort({ flagCount: -1 });
    res.json(flagged);
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   UNFLAG A QUESTION (Admin resolve)
=========================================== */
exports.unflagQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      { $set: { isFlagged: false, flagCount: 0 } },
      { new: true }
    );
    if (!question) return next(new AppError("Question not found", 404));
    res.json({ message: "Question flag cleared.", question });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   INITIATE RETAKE
=========================================== */
exports.retakeTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const purchasedTest = user.purchasedTests.find(pt => pt.testId.toString() === testId);
    if (!purchasedTest) return next(new AppError("You have not purchased this test", 403));

    // Count previous attempts
    const previousAttempts = await Attempt.countDocuments({ userId, testId });
    
    // Reset completion flag to allow retake
    purchasedTest.isCompleted = false;
    purchasedTest.draftAnswers = [];
    purchasedTest.timeRemaining = null;
    purchasedTest.startedAt = null;
    await user.save();

    res.json({ 
      message: "Retake initiated. Good luck!", 
      retakeNumber: previousAttempts + 1
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET ALL ATTEMPTS FOR A TEST (User history)
=========================================== */
exports.getTestAttemptHistory = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const attempts = await Attempt.find({ userId: req.user.id, testId })
      .select("score percentage timeTaken retakeNumber createdAt")
      .sort({ createdAt: 1 });
    res.json(attempts);
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   CLONE A SERIES (Admin)
=========================================== */
exports.cloneSeries = async (req, res, next) => {
  try {
    const original = await QuizSeries.findById(req.params.id);
    if (!original) return next(new AppError("Series not found", 404));

    const cloneData = original.toObject();
    delete cloneData._id;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;

    const clone = await QuizSeries.create({
      ...cloneData,
      title: `${original.title} (Copy)`,
      clonedFrom: original._id,
      version: 1,
      isPublished: false,
      createdBy: req.user.id
    });

    // Clone all papers in the series
    const papers = await TestSeries.find({ seriesId: req.params.id });
    for (const paper of papers) {
      const paperData = paper.toObject();
      delete paperData._id;
      delete paperData.createdAt;
      delete paperData.updatedAt;

      const newPaper = await TestSeries.create({ ...paperData, seriesId: clone._id, isPublished: false });

      // Clone all questions in each paper
      const questions = await Question.find({ testId: paper._id });
      if (questions.length > 0) {
        await Question.insertMany(questions.map(q => {
          const qData = q.toObject();
          delete qData._id;
          delete qData.createdAt;
          delete qData.updatedAt;
          return { ...qData, testId: newPaper._id, isFlagged: false, flagCount: 0 };
        }));
      }
    }

    res.status(201).json({ message: `Series cloned successfully as "${clone.title}"`, series: clone });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   TOGGLE SERIES PUBLISH STATUS (Admin)
=========================================== */
exports.toggleSeriesPublish = async (req, res, next) => {
  try {
    const series = await QuizSeries.findById(req.params.id);
    if (!series) return next(new AppError("Series not found", 404));

    series.isPublished = !series.isPublished;
    await series.save();

    res.json({ 
      message: `Series ${series.isPublished ? "published" : "unpublished"} successfully.`,
      isPublished: series.isPublished
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   BAN / UNBAN USER (Admin)
=========================================== */
exports.toggleUserBan = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));
    if (user.role === "admin") return next(new AppError("Cannot ban an admin account", 403));

    user.isBanned = !user.isBanned;
    user.banReason = user.isBanned ? (reason || "Violation of platform terms") : null;
    await user.save();

    res.json({ 
      message: `User ${user.isBanned ? "banned" : "unbanned"} successfully.`,
      isBanned: user.isBanned
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET USER ACTIVITY (Admin)
=========================================== */
exports.getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return next(new AppError("User not found", 404));

    const attempts = await Attempt.find({ userId: req.params.userId })
      .populate("testId", "title category")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ user, attempts, totalAttempts: attempts.length });
  } catch (err) {
    next(err);
  }
};
