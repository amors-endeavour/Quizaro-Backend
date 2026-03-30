const User = require("../models/user");
const TestSeries = require("../models/testSeries");
const Attempt = require("../models/attempt");
const Question = require("../models/question");
const AppError = require("../utils/AppError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user
    });

  } catch (err) {
    next(err);
  }
};

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


const mongoose = require("mongoose");

/* ===========================================
   DELETE TEST (FULL CASCADE DELETE 🔥)
=========================================== */
exports.deleteTest = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const testId = req.params.testId;

    // 🔍 Check if test exists
    const test = await TestSeries.findById(testId).session(session);

    if (!test) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Test not found", 404));
    }

    // ===============================
    // 🔥 CASCADE DELETE
    // ===============================

    // ❌ Delete all questions
    await Question.deleteMany({ testId }).session(session);

    // ❌ Delete all attempts
    await Attempt.deleteMany({ testId }).session(session);

    // ❌ Remove test from users (VERY IMPORTANT 🔥)
    await User.updateMany(
      { "purchasedTests.testId": testId },
      {
        $pull: {
          purchasedTests: { testId }
        }
      }
    ).session(session);

    // ❌ Delete test itself
    await TestSeries.findByIdAndDelete(testId).session(session);

    // ===============================
    // COMMIT
    // ===============================
    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Test and all related data deleted successfully"
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
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