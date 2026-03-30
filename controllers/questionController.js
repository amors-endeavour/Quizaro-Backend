import Question from "../models/question.js";
import User from "../models/user.js";
import AppError from "../utils/AppError.js";

/* ===========================================
   ADD QUESTION (Admin Only)
=========================================== */
export const addQuestion = async (req, res, next) => {
  try {
    const { questionText, options, correctOption, explanation } = req.body;

    // ❌ Basic validation
    if (!questionText || !options || options.length < 2) {
      return next(new AppError("Invalid question data", 400));
    }

    const question = await Question.create({
      testId: req.params.testId,
      questionText,
      options,
      correctOption,
      explanation
    });

    res.status(201).json(question);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET QUESTIONS FOR TEST
   - Validates purchase, completion, expiry
   - Hides answers
=========================================== */
export const getTestQuestions = async (req, res, next) => {
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
    const questions = await Question.find({ testId })
      .select("-correctOption -explanation");

    res.json(questions);

  } catch (error) {
    next(error);
  }
};