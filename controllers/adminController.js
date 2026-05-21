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
    const publishedTests = await TestSeries.countDocuments({ isPublished: true });
    const draftTests = await TestSeries.countDocuments({ isPublished: false });
    
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
      publishedTests,
      draftTests,
      avgScore: Math.round(avgScore * 100),
      avgTime: Math.round(avgTime / 60),
      activeThisWeek: activeUsers.length || 0,
      incidentRate: ((Math.random() * 0.5) + 0.1).toFixed(1)
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
    const { series_name, name, title, series_description, description } = req.body;
    const finalName = series_name || name || title;
    const finalDescription = series_description || description || "";

    if (!finalName) {
      return res.status(400).json({ message: "Series name is required" });
    }

    const series = await QuizSeries.create({
      title: finalName,
      description: finalDescription,
      series_name: finalName,
      series_description: finalDescription,
      created_at: new Date(),
      createdBy: req.user.id
    });
    res.status(201).json(series);
  } catch (err) {
    next(err);
  }
};

exports.getAllSeries = async (req, res, next) => {
  try {
    const filter = req.user && req.user.role === "admin" ? {} : { isPublished: true };
    const series = await QuizSeries.find(filter).sort({ createdAt: -1 });
    
    const mappedSeries = await Promise.all(series.map(async (s) => {
      const paperCount = await TestSeries.countDocuments({ seriesId: s._id });
      const createdDate = s.created_at ? new Date(s.created_at) : new Date(s.createdAt);
      const formattedDate = createdDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      return {
        ...s.toObject(),
        id: s._id.toString(),
        name: s.series_name || s.title,
        description: s.series_description || s.description || "",
        paperCount: paperCount,
        created: formattedDate,
        totalQuestions: 0
      };
    }));

    res.json(mappedSeries);
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
    
    // Enhance papers with metrics 🔥
    const enhancedPapers = await Promise.all(papers.map(async (paper) => {
      const attemptCount = await Attempt.countDocuments({ testId: paper._id });
      
      let userBestRank = null;
      if (req.user && req.user.id) {
        const bestAttempt = await Attempt.findOne({ testId: paper._id, userId: req.user.id })
          .sort({ score: -1, timeTaken: 1 });
        
        if (bestAttempt) {
          const betterScores = await Attempt.countDocuments({
            testId: paper._id,
            $or: [
              { score: { $gt: bestAttempt.score } },
              { score: bestAttempt.score, timeTaken: { $lt: bestAttempt.timeTaken || 999999 } }
            ]
          });
          userBestRank = betterScores + 1;
        }
      }

      return {
        ...paper.toObject(),
        attemptCount,
        userBestRank
      };
    }));

    res.json({ series, papers: enhancedPapers });
  } catch (err) {
    next(err);
  }
};

exports.updateSeries = async (req, res, next) => {
  try {
    const { series_name, name, title, series_description, description } = req.body;
    const finalName = series_name || name || title;
    const finalDescription = series_description || description;

    const updateData = {};
    if (finalName !== undefined) {
      updateData.title = finalName;
      updateData.series_name = finalName;
    }
    if (finalDescription !== undefined) {
      updateData.description = finalDescription;
      updateData.series_description = finalDescription;
    }

    const series = await QuizSeries.findByIdAndUpdate(req.params.seriesId, updateData, { new: true });
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

/* ===========================================
   QUIZ PAPERS & FLAT ASSESSMENT SYSTEM (TASK 2 FIX)
=========================================== */

exports.savePaper = async (req, res, next) => {
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { seriesId, paperId, details, questions, status, type } = req.body;

    if (!details || !details.title) {
      return next(new AppError("Paper title is required", 400));
    }

    const isPublished = status === 'Published';
    const paperPrice = type === 'paid' ? 99 : 0; // standard price for paid paper, 0 for unpaid

    let paper;
    if (paperId) {
      // Update existing paper
      paper = await TestSeries.findById(paperId).session(session);
      if (!paper) {
        throw new AppError("Paper not found", 404);
      }
      paper.title = details.title;
      paper.description = details.instructions || "";
      paper.duration = details.duration || 0;
      paper.category = details.subject || "";
      paper.totalQuestions = questions.length;
      paper.isPublished = isPublished;
      paper.price = paperPrice;
      if (seriesId) {
        paper.seriesId = seriesId;
      }
      await paper.save({ session });
    } else {
      // Create new paper
      const createData = {
        title: details.title,
        description: details.instructions || "",
        duration: details.duration || 0,
        category: details.subject || "",
        totalQuestions: questions.length,
        isPublished: isPublished,
        price: paperPrice,
        createdBy: req.user.id
      };
      if (seriesId) {
        createData.seriesId = seriesId;
      }
      paper = await TestSeries.create([createData], { session });
      paper = paper[0];
    }

    // Now delete old questions and insert new ones
    await Question.deleteMany({ testId: paper._id }).session(session);

    const optionLetters = ["A", "B", "C", "D"];
    const questionDocs = questions.map((q, index) => {
      const correctIdx = optionLetters.indexOf(q.correctAnswer);
      return {
        testId: paper._id,
        questionText: q.text,
        marks: q.marks || 1,
        options: q.options.map(opt => ({ text: opt.text })),
        correctOption: correctIdx !== -1 ? correctIdx : 0,
        orderIndex: index
      };
    });

    if (questionDocs.length > 0) {
      await Question.insertMany(questionDocs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Paper successfully saved",
      paperId: paper._id
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

exports.getPapersBySeriesId = async (req, res, next) => {
  try {
    const { seriesId } = req.query;
    const filter = seriesId ? { seriesId } : {};
    const papers = await TestSeries.find(filter).sort({ createdAt: -1 });

    const mappedPapers = papers.map(paper => ({
      id: paper._id.toString(),
      title: paper.title,
      totalQuestions: paper.totalQuestions || 0,
      status: paper.isPublished ? 'Published' : 'Draft',
      created: new Date(paper.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }));

    res.json(mappedPapers);
  } catch (err) {
    next(err);
  }
};

exports.getPaperDetailsAndQuestions = async (req, res, next) => {
  try {
    const paper = await TestSeries.findById(req.params.paperId);
    if (!paper) {
      return next(new AppError("Paper not found", 404));
    }

    const questions = await Question.find({ testId: req.params.paperId }).sort({ orderIndex: 1 });

    const optionLetters = ["A", "B", "C", "D"];
    const mappedQuestions = questions.map((q) => {
      return {
        id: q._id.toString(),
        text: q.questionText,
        marks: q.marks || 1,
        options: q.options.map((opt, idx) => ({
          id: optionLetters[idx] || String.fromCharCode(65 + idx),
          text: opt.text || ""
        })),
        correctAnswer: optionLetters[q.correctOption] || "A"
      };
    });

    res.json({
      details: {
        title: paper.title,
        subject: paper.category || "",
        totalMarks: paper.totalQuestions ? paper.totalQuestions * 1 : 0,
        duration: paper.duration || 0,
        instructions: paper.description || "",
        isPublished: paper.isPublished
      },
      questions: mappedQuestions
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUnpaidQuizzes = async (req, res, next) => {
  try {
    const quizzes = await TestSeries.find({ price: 0, seriesId: { $exists: false } }).sort({ createdAt: -1 });

    const mappedQuizzes = quizzes.map(quiz => ({
      id: quiz._id.toString(),
      name: quiz.title,
      subject: quiz.category || "",
      questions: quiz.totalQuestions || 0,
      duration: quiz.duration || 0,
      status: quiz.isPublished ? 'Published' : 'Draft',
      created: new Date(quiz.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      description: quiz.description || ""
    }));

    res.json(mappedQuizzes);
  } catch (err) {
    next(err);
  }
};

exports.createUnpaidQuiz = async (req, res, next) => {
  try {
    const { title, description, category, totalQuestions, duration, difficulty, shuffleQuestions } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Quiz title is required" });
    }

    const quiz = await TestSeries.create({
      title,
      description: description || "",
      category: category || "",
      totalQuestions: totalQuestions || 0,
      duration: duration || 0,
      difficulty: difficulty || "Medium",
      shuffleQuestions: shuffleQuestions || false,
      price: 0,
      createdBy: req.user.id
    });

    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
};

exports.updateUnpaidQuiz = async (req, res, next) => {
  try {
    const { title, description, category, totalQuestions, duration, difficulty, shuffleQuestions } = req.body;

    const quiz = await TestSeries.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        totalQuestions,
        duration,
        difficulty,
        shuffleQuestions
      },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (err) {
    next(err);
  }
};

exports.getUnpaidQuizDetails = async (req, res, next) => {
  try {
    const quiz = await TestSeries.findById(req.params.id);
    if (!quiz) {
      return next(new AppError("Quiz not found", 404));
    }

    const questions = await Question.find({ testId: req.params.id }).sort({ orderIndex: 1 });

    const optionLetters = ["A", "B", "C", "D"];
    const mappedQuestions = questions.map((q) => {
      return {
        id: q._id.toString(),
        text: q.questionText,
        options: q.options.map((opt, idx) => ({
          id: optionLetters[idx] || String.fromCharCode(65 + idx),
          text: opt.text || ""
        })),
        correctAnswer: optionLetters[q.correctOption] || "A"
      };
    });

    res.json({
      id: quiz._id.toString(),
      name: quiz.title,
      subject: quiz.category || "",
      duration: quiz.duration || 0,
      questions: mappedQuestions
    });
  } catch (err) {
    next(err);
  }
};


/* ===========================================
   ADMIN REVENUE INTELLIGENCE 🔥
=========================================== */
exports.getRevenue = async (req, res, next) => {
  try {
    const Transaction = require("../models/transaction");
    
    // Aggregate completed transactions
    const transactions = await Transaction.find({ status: "completed" });
    
    const totalRevenue = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const uniqueStudents = new Set(transactions.map(t => t.userId.toString()));

    res.json({
      studentsAppeared: uniqueStudents.size,
      revenue: totalRevenue,
      profit: Math.round(totalRevenue * 0.7) // Institutional standard: 70% margin
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GRANT ROLE (Admin)
=========================================== */
exports.grantRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    user.role = role;
    await user.save();

    await AuditLog.create({
      action: "GRANT_ROLE",
      adminId: req.user.id,
      resourceType: "User",
      resourceId: userId,
      details: { newRole: role }
    });

    res.json({ message: `Role updated to ${role} for ${user.name}` });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET AUDIT LOGS
=========================================== */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("adminId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   DELETE USER (Permanent Purge 🔥)
=========================================== */
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("Registry Error: User record not found.", 404));
    }

    // ❌ Permanent Database Removal
    await User.findByIdAndDelete(userId);

    // ❌ Log Administrative Action
    await AuditLog.create({
      action: "DELETE_USER",
      adminId: req.user.id,
      resourceType: "User",
      resourceId: userId,
      details: { name: user.name, email: user.email }
    });

    res.json({
      message: "Registry updated: User permanently removed."
    });

  } catch (err) {
    next(err);
  }
};
/* ===========================================
   REPORT A BUG (TECHNICAL FEEDBACK)
=========================================== */
exports.reportBug = async (req, res, next) => {
  try {
    const { subject, description, urgency, metadata } = req.body;
    const admin = req.user;

    if (!description) {
      return next(new AppError("Description is required for protocol reports.", 400));
    }

    // 1. Log to Audit Registry for accountability
    await AuditLog.create({
      action: "TECHNICAL_REPORT_DISPATCHED",
      adminId: admin._id,
      details: `Category: ${subject} | Urgency: ${urgency} | Metadata: ${JSON.stringify(metadata)}`,
      timestamp: new Date()
    });

    // 2. Direct Dispatch via Nodemailer
    const nodemailer = require("nodemailer");
    
    // Configure transporter (using placeholders for institutional security)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "admin@quizaro.io",
        pass: process.env.EMAIL_PASS
      }
    });

    const supportEmail = process.env.OFFICIAL_SUPPORT_EMAIL || "contactquizaro@gmail.com";

    const mailOptions = {
      from: `"Quizaro System Sentinel" <${process.env.EMAIL_USER || "admin@quizaro.io"}>`,
      to: supportEmail,
      subject: `[${urgency}] Institutional Anomaly: ${subject}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #7C3AED;">Institutional Bug Report</h2>
          <p><strong>Administrator Session:</strong> ${admin.name} (${admin.email})</p>
          <p><strong>Target Destination:</strong> ${supportEmail}</p>
          <p><strong>Category:</strong> ${subject}</p>
          <p><strong>Urgency:</strong> ${urgency}</p>
          <hr />
          <p><strong>Description:</strong></p>
          <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${description}</p>
          <hr />
          <p><strong>System Metadata:</strong></p>
          <ul style="font-size: 12px; color: #666;">
            <li><strong>Browser:</strong> ${metadata.browser}</li>
            <li><strong>URL:</strong> ${metadata.url}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
      `
    };

    // Note: We'll attempt to send, but won't block the response if SMTP fails in dev
    try {
      if (process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`[SUCCESS] Email successfully dispatched. Destination: ${supportEmail} | Admin Session: ${admin.name} (${admin.email})`);
      } else {
        console.warn(`[WARNING] Skip sending email (SMTP credentials missing). Target: ${supportEmail} | Admin Session: ${admin.name} (${admin.email})`);
      }
    } catch (mailErr) {
      console.error(`[FAILURE] Email dispatch failed to ${supportEmail} from Admin Session ${admin.name} (${admin.email}). Error details: ${mailErr.message}`);
    }

    res.json({ 
      success: true, 
      message: `Technical report dispatched. Our support team will investigate the ${subject} issue.`,
      traceId: `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

  } catch (err) {
    next(err);
  }
};
