const Question = require("../models/question");
const User = require("../models/user");

/* ===========================================
   ADD QUESTION (Admin Only)
=========================================== */

exports.addQuestion = async (req, res) => {
  try {

    const { questionText, options, correctOption, explanation } = req.body;

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
   - Used when user starts test
   - Includes purchase + expiry + completion checks
   - Hides correct answers
=========================================== */

exports.getTestQuestions = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    // 🔍 Find purchased test
    const purchasedTest = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    // ❌ If not purchased
    if (!purchasedTest) {
      return res.status(403).json({
        message: "You have not purchased this test"
      });
    }

    // ❌ If expired (after 3 days)
    const now = new Date();
    if (now > purchasedTest.expiresAt) {
      return res.status(403).json({
        message: "Test expired"
      });
    }

    // ❌ If already completed
    if (purchasedTest.isCompleted) {
      return res.status(403).json({
        message: "Test already completed"
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