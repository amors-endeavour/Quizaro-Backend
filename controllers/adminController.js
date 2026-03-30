import User from "../models/user.js";
import TestSeries from "../models/testSeries.js";
import Attempt from "../models/attempt.js";
import Question from "../models/question.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

/* ===========================================
   GET ALL USERS
=========================================== */
export const getAllUsers = async (req, res, next) => {
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
export const getAllTestsAdmin = async (req, res, next) => {
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
export const getAllAttempts = async (req, res, next) => {
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
   DELETE TEST (FULL CASCADE DELETE 🔥)
=========================================== */
export const deleteTest = async (req, res, next) => {
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
export const deleteQuestion = async (req, res, next) => {
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
export const updateTest = async (req, res, next) => {
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
export const getAdminStats = async (req, res, next) => {
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