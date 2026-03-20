const TestSeries = require("../models/testSeries");
const User = require("../models/user");

/* ===========================================
   CREATE TEST (Admin Only)
=========================================== */

exports.createTest = async (req, res) => {
  try {

    const test = await TestSeries.create({
      ...req.body,
      createdBy: req.user.id // track admin
    });

    res.status(201).json(test);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET ALL TESTS
=========================================== */

exports.getAllTests = async (req, res) => {

  const tests = await TestSeries.find()
    .sort({ createdAt: -1 }); // latest first

  res.json(tests);
};


/* ===========================================
   GET SINGLE TEST
=========================================== */

exports.getSingleTest = async (req, res) => {

  const test = await TestSeries.findById(req.params.testId);

  res.json(test);
};


/* ===========================================
   PURCHASE TEST (Student Only)
=========================================== */

exports.purchaseTest = async (req, res) => {
  try {

    // Find logged-in user
    const user = await User.findById(req.user.id);

    const testId = req.params.testId;

    // Check if already purchased
    const alreadyPurchased = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    if (alreadyPurchased) {
      return res.status(400).json({
        message: "Test already purchased"
      });
    }

    // Create expiry date (3 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate()+3);

    // Add test to purchasedTests array
    user.purchasedTests.push({
      testId,
      purchasedAt: new Date(),
      expiresAt,
      isCompleted: false
    });

    await user.save();

    res.json({
      message: "Test purchased successfully",
      expiresAt
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};