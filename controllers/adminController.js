const User = require("../models/user");
const TestSeries = require("../models/testSeries");
const Attempt = require("../models/attempt");
const Question = require("../models/question");
const AppError = require("../utils/AppError");

/* ===========================================
   GET ALL USERS
=========================================== */
exports.getAllUsers = async (req, res, next) => {
  try {

    const users = await User.find().select("-password");

    if (!users.length) {
      return next(new AppError("No users found", 404));
    }

    res.json(users);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET ALL TESTS (ADMIN VIEW)
=========================================== */
exports.getAllTestsAdmin = async (req, res, next) => {
  try {

    const tests = await TestSeries.find()
      .populate("createdBy", "name");

    if (!tests.length) {
      return next(new AppError("No tests found", 404));
    }

    res.json(tests);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET ALL ATTEMPTS
=========================================== */
exports.getAllAttempts = async (req, res, next) => {
  try {

    const attempts = await Attempt.find()
      .populate("userId", "name email")
      .populate("testId", "title");

    if (!attempts.length) {
      return next(new AppError("No attempts found", 404));
    }

    res.json(attempts);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   DELETE TEST
=========================================== */
exports.deleteTest = async (req, res, next) => {
  try {

    const test = await TestSeries.findByIdAndDelete(req.params.testId);

    if (!test) {
      return next(new AppError("Test not found", 404));
    }

    // 🔥 Also delete related questions (optional but recommended)
    await Question.deleteMany({ testId: req.params.testId });

    // 🔥 Also delete attempts of this test (optional)
    await Attempt.deleteMany({ testId: req.params.testId });

    res.json({
      message: "Test deleted successfully"
    });

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   DELETE QUESTION
=========================================== */
exports.deleteQuestion = async (req, res, next) => {
  try {

    const question = await Question.findByIdAndDelete(req.params.questionId);

    if (!question) {
      return next(new AppError("Question not found", 404));
    }

    res.json({
      message: "Question deleted successfully"
    });

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   UPDATE TEST
=========================================== */
exports.updateTest = async (req, res, next) => {
  try {

    const test = await TestSeries.findByIdAndUpdate(
      req.params.testId,
      req.body,
      { new: true }
    );

    if (!test) {
      return next(new AppError("Test not found", 404));
    }

    res.json(test);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   DASHBOARD STATS
=========================================== */
exports.getAdminStats = async (req, res, next) => {
  try {

    const totalUsers = await User.countDocuments();
    const totalTests = await TestSeries.countDocuments();
    const totalAttempts = await Attempt.countDocuments();

    res.json({
      totalUsers,
      totalTests,
      totalAttempts
    });

  } catch (err) {
    next(err);
  }
};