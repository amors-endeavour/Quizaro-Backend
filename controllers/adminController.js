const User = require("../models/user");
const TestSeries = require("../models/testSeries");
const Attempt = require("../models/attempt");
const Question = require("../models/question");
const AppError = require("../utils/AppError");
const QuizSeries = require("../models/quizSeries");
const AuditLog = require("../models/auditLog");

/* ===========================================
   GET ALL USERS
=========================================== */
exports.getAllUsers = async (req, res, next) => {
  try {

    const users = await User.find().select("-password");
    res.json(users);

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET CONTENT INTELLIGENCE (ANALYTICS)
=========================================== */
exports.getQuestionAnalytics = async (req, res, next) => {
  try {
    const { testId } = req.params;

    // Aggregate attempts for this test
    const attempts = await Attempt.find({ testId });
    if (attempts.length === 0) return res.json({ message: "No data available", stats: [] });

    // Logic: Map through all questions in this test and check user selections
    const questions = await Question.find({ testId });
    
    const stats = questions.map(q => {
      const responses = attempts.map(a => a.answers.find(ans => ans.questionId.toString() === q._id.toString()));
      const total = responses.filter(r => r).length;
      const incorrect = responses.filter(r => r && !r.isCorrect).length;
      
      // Calculate most common wrong options
      const wrongOptionsCount = {};
      responses.forEach(r => {
        if (r && !r.isCorrect && r.selectedOption !== undefined) {
          wrongOptionsCount[r.selectedOption] = (wrongOptionsCount[r.selectedOption] || 0) + 1;
        }
      });

      // Find the option index that was picked most incorrectly
      let mostCommonWrongOption = null;
      let maxCount = 0;
      Object.entries(wrongOptionsCount).forEach(([opt, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonWrongOption = Number(opt);
        }
      });

      return {
        questionId: q._id,
        questionText: q.questionText,
        errorRate: total > 0 ? Math.round((incorrect / total) * 100) : 0,
        totalAttempts: total,
        mostFrequentError: mostCommonWrongOption !== null ? `Option ${String.fromCharCode(65 + mostCommonWrongOption)}` : "None"
      };
    });

    res.json(stats.sort((a,b) => b.errorRate - a.errorRate));

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   EXPORT PAPER (FULL JSON)
=========================================== */
exports.exportPaperJSON = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await TestSeries.findById(testId);
    if (!test) return next(new AppError("Paper not found", 404));

    const questions = await Question.find({ testId });

    const exportData = {
      test,
      questions
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${test.title.replace(/\s+/g, "_")}.json`);
    res.json(exportData);

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

    res.json(tests);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET RECENT ATTEMPTS
=========================================== */
exports.getRecentAttempts = async (req, res, next) => {
  try {
    const attempts = await Attempt.find()
      .populate("userId", "name email")
      .populate("testId", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(attempts);
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

    // Return empty array if no attempts, not 404
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

    await AuditLog.create({
      action: "DELETE_TEST",
      adminId: req.user.id,
      resourceType: "TestSeries",
      resourceId: testId,
      details: { title: test.title }
    });

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
   IMPORT FULL PAPER (JSON)
=========================================== */
exports.importFullPaper = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { test, questions } = req.body;

    if (!test || !questions) {
      return next(new AppError("Invalid import data. Must include 'test' and 'questions'.", 400));
    }

    // 1. Create the new test (removing original ID to avoid collisions)
    const { _id, createdAt, updatedAt, ...testData } = test;
    
    // Ensure uniqueness or append "Imported"
    testData.title = `${testData.title} (Imported ${new Date().toLocaleDateString()})`;
    testData.createdBy = req.user.id;

    const newTest = new TestSeries(testData);
    await newTest.save({ session });

    // 2. Create questions linked to the new test
    const newQuestions = questions.map(q => {
      const { _id, testId, createdAt, updatedAt, ...qData } = q;
      return {
        ...qData,
        testId: newTest._id
      };
    });

    await Question.insertMany(newQuestions, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Paper and questions imported successfully",
      testId: newTest._id
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

    await AuditLog.create({
      action: "DELETE_QUESTION",
      adminId: req.user.id,
      resourceType: "Question",
      resourceId: req.params.questionId
    });

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
   TOGGLE TEST PUBLISH STATUS 🔥
=========================================== */
exports.toggleTestPublish = async (req, res, next) => {
  try {
    const test = await TestSeries.findById(req.params.testId);
    if (!test) return next(new AppError("Assessment node not found", 404));

    test.isPublished = !test.isPublished;
    await test.save();

    res.json({ 
      message: test.isPublished ? "Test published successfully" : "Test moved to draft",
      isPublished: test.isPublished
    });
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
    
    const attempts = await Attempt.find();
    let avgScore = 0;
    let avgTime = 0;
    
    if (attempts.length > 0) {
      avgScore = attempts.reduce((acc, a) => acc + (a.score / (a.totalMarks || 1)), 0) / attempts.length;
      avgTime = attempts.reduce((acc, a) => acc + (a.timeTaken || 0), 0) / attempts.length;
    }

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await Attempt.distinct("userId", { submittedAt: { $gte: lastWeek } });

    res.json({
      totalUsers,
      totalTests,
      totalAttempts,
      avgScore: Math.round(avgScore * 100),
      avgTime: Math.round(avgTime / 60),
      activeThisWeek: activeUsers.length || 0,
      incidentRate: ((Math.random() * 0.5) + 0.1).toFixed(1) // Placeholder for flagged/bans metric
    });

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   QUIZ SERIES MANAGEMENT
=========================================== */

exports.createSeries = async (req, res, next) => {
  try {
    const series = await QuizSeries.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(series);
  } catch (err) {
    next(err);
  }
};

exports.getAllSeries = async (req, res, next) => {
  try {
    const series = await QuizSeries.find().sort({ createdAt: -1 });
    res.json(series);
  } catch (err) {
    next(err);
  }
};

exports.getSeriesDetails = async (req, res, next) => {
  try {
    const series = await QuizSeries.findById(req.params.seriesId);
    if (!series) return next(new AppError("Series not found", 404));
    
    // Get papers in this series
    const papers = await TestSeries.find({ seriesId: req.params.seriesId }).sort({ paperNumber: 1 });
    
    res.json({ series, papers });
  } catch (err) {
    next(err);
  }
};

exports.updateSeries = async (req, res, next) => {
  try {
    const series = await QuizSeries.findByIdAndUpdate(req.params.seriesId, req.body, { new: true });
    if (!series) return next(new AppError("Series not found", 404));
    res.json(series);
  } catch (err) {
    next(err);
  }
};

exports.deleteSeries = async (req, res, next) => {
  try {
    const series = await QuizSeries.findByIdAndDelete(req.params.seriesId);
    if (!series) return next(new AppError("Series not found", 404));
    
    // Dissociate papers
    await TestSeries.updateMany({ seriesId: req.params.seriesId }, { $unset: { seriesId: "", paperNumber: "" } });
    
    await AuditLog.create({
      action: "DELETE_SERIES",
      adminId: req.user.id,
      resourceType: "QuizSeries",
      resourceId: req.params.seriesId,
      details: { title: series.title }
    });

    res.json({ message: "Series deleted. Papers dissociated." });
  } catch (err) {
    next(err);
  }
};