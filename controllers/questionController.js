const Question = require("../models/question");
const User = require("../models/user");

/* ===========================================
   ADD QUESTION (Admin Only)
=========================================== */
exports.addQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOption, explanation } = req.body;

    // ❌ Basic validation
    if (!questionText || !options || options.length < 2) {
      return res.status(400).json({
        message: "Invalid question data"
      });
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
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET QUESTIONS FOR TEST
   - Validates purchase, completion, expiry
   - Hides answers
=========================================== */
exports.getTestQuestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    // 🔍 Find purchased test
    const purchasedTest = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    // ❌ Not purchased
    if (!purchasedTest) {
      return res.status(403).json({
        message: "You have not purchased this test"
      });
    }

    // ❌ Completed FIRST (highest priority)
    if (purchasedTest.isCompleted) {
      return res.status(403).json({
        message: "Test already completed"
      });
    }

    // ❌ Expired AFTER
    const now = new Date();
    if (now > purchasedTest.expiresAt) {
      return res.status(403).json({
        message: "Test expired"
      });
    }

    // ✅ Fetch questions (hide answers for security)
    const questions = await Question.find({ testId })
      .select("-correctOption -explanation");

    res.json(questions);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};