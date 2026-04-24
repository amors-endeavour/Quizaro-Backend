const mongoose = require("mongoose");
const Question = require("../models/question");
const User = require("../models/user");
const AppError = require("../utils/AppError");

/* ===========================================
   ADD QUESTION (Admin Only)
=========================================== */
exports.addQuestion = async (req, res, next) => {
  try {
    const { questionText, options, correctOption, explanation } = req.body;

    // ❌ Basic validation
    if (!questionText || !options || options.length < 2) {
      return next(new AppError("Invalid question data", 400));
    }

    const question = await Question.create({
      testId: req.params.testId,
      ...req.body,
      marks: req.body.marks || req.body.points || 1 // Map points to marks 🔥
    });

    res.status(201).json(question);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   UPDATE QUESTION (Admin Only)
=========================================== */
exports.updateQuestion = async (req, res, next) => {
  try {
    const { questionText, options, correctOption, explanation } = req.body;

    if (!questionText || !options || options.length < 2) {
      return next(new AppError("Invalid question data", 400));
    }

    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      { 
        ...req.body, 
        marks: req.body.marks || req.body.points || 1 // Map points to marks 🔥
      },
      { new: true }
    );

    if (!question) {
      return next(new AppError("Question not found", 404));
    }

    res.json(question);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET QUESTIONS FOR TEST
   - Validates purchase, completion, expiry
   - Hides answers
=========================================== */
exports.getTestQuestions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    // 🔍 Find purchased test
    const purchasedTest = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    // ❌ Not purchased
    if (!purchasedTest) {
      return next(new AppError("You have not purchased this test", 403));
    }

    // ❌ Completed FIRST (highest priority)
    if (purchasedTest.isCompleted) {
      return next(new AppError("Test already completed", 403));
    }

    // ❌ Expired AFTER
    const now = new Date();
    if (now > purchasedTest.expiresAt) {
      return next(new AppError("Test expired", 403));
    }

    // ✅ Fetch questions (hide answers for security)
    const questions = await Question.find({ testId: new mongoose.Types.ObjectId(testId) })
      .select("-explanation"); // Keep correctOption if we need to map, or we can use another way

    const test = await require("../models/testSeries").findById(testId);

    // Logic: Randomized Fisher-Yates Shuffle for Questions
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Logic: Option Shuffling 🔥
    let responseQuestions = questions.map(q => {
        const questionObj = q.toObject();
        
        // Map options to include original index for submission safety
        questionObj.options = questionObj.options.map((opt, idx) => ({
            ...opt,
            originalIndex: idx
        }));

        if (test && test.shuffleOptions) {
            // Shuffle choices
            for (let i = questionObj.options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questionObj.options[i], questionObj.options[j]] = [questionObj.options[j], questionObj.options[i]];
            }
        }
        
        // Hide correctOption from response for security
        delete questionObj.correctOption;
        return questionObj;
    });

    res.json(responseQuestions);

  } catch (error) {
    next(error);
  }
};


/* ===========================================
   GET ALL QUESTIONS FOR TEST (Admin - with answers)
=========================================== */
exports.getAllQuestionsAdmin = async (req, res, next) => {
  try {
    const questions = await Question.find({ testId: req.params.testId });
    res.json(questions);
  } catch (error) {
    next(error);
  }
};