const Attempt = require("../models/attempt");
const Question = require("../models/question");
const User = require("../models/user");

/* ===========================================
   SUBMIT TEST
   - Validates answers strictly
   - Calculates score
   - Marks test completed
=========================================== */
exports.submitTest = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const testId = req.params.testId;
    const userId = req.user.id;

    // 🔍 Fetch user
    const user = await User.findById(userId);

    // ❌ Check purchase
    const purchasedTest = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    if (!purchasedTest) {
      return res.status(403).json({
        message: "You have not purchased this test"
      });
    }

    // ❌ Already attempted (via completion flag)
    if (purchasedTest.isCompleted) {
      return res.status(400).json({
        message: "You have already attempted this test"
      });
    }

    // ❌ Prevent duplicate attempt entry (extra safety)
    const alreadyAttempted = await Attempt.findOne({ userId, testId });
    if (alreadyAttempted) {
      return res.status(400).json({
        message: "You have already attempted this test"
      });
    }

    // 🔍 Fetch questions
    const questions = await Question.find({ testId });

    if (!questions.length) {
      return res.status(400).json({
        message: "No questions found for this test"
      });
    }

    // ❌ Validate answer count
    if (answers.length !== questions.length) {
      return res.status(400).json({
        message: "All questions must be answered"
      });
    }

    // ❌ Check duplicate questionIds
    const questionIds = answers.map(a => a.questionId);
    const uniqueIds = new Set(questionIds);

    if (uniqueIds.size !== questionIds.length) {
      return res.status(400).json({
        message: "Duplicate questionIds found"
      });
    }

    // ❌ Ensure all questions belong to test
    const validQuestionIds = questions.map(q => q._id.toString());

    for (let ans of answers) {
      if (!validQuestionIds.includes(ans.questionId)) {
        return res.status(400).json({
          message: "Invalid questionId or question not in this test"
        });
      }
    }

    // ===============================
    // SCORE CALCULATION
    // ===============================
    let score = 0;
    let resultAnswers = [];

    for (let userAnswer of answers) {

      const question = questions.find(
        q => q._id.toString() === userAnswer.questionId
      );

      // Check correctness
      const isCorrect =
        question.correctOption === userAnswer.selectedOption;

      if (isCorrect) score++;

      resultAnswers.push({
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: userAnswer.selectedOption,
        correctOption: question.correctOption,
        isCorrect,
        explanation: question.explanation
      });
    }

    // 📊 Calculate percentage
    const percentage = ((score / questions.length) * 100).toFixed(2);

    // 💾 Save attempt
    const attempt = await Attempt.create({
      userId,
      testId,
      answers: resultAnswers,
      score,
      percentage,
      timeTaken
    });

    // ===============================
    // MARK TEST AS COMPLETED
    // ===============================
    purchasedTest.isCompleted = true;
    await user.save();

    // ===============================
    // RANK CALCULATION
    // ===============================
    const betterScores = await Attempt.countDocuments({
      testId,
      $or: [
        { score: { $gt: score } },
        { score: score, timeTaken: { $lt: timeTaken } }
      ]
    });

    const rank = betterScores + 1;

    // 📤 Response
    res.status(201).json({
      message: "Test submitted successfully",
      attemptId: attempt._id,
      score,
      percentage,
      rank,
      answers: resultAnswers
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};