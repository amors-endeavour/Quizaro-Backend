const TestSeries = require("../models/testSeries");
const User = require("../models/user");

/* ===========================================
   CREATE TEST (Admin Only)
=========================================== */
exports.createTest = async (req, res) => {
  try {
    const test = await TestSeries.create({
      ...req.body,
      createdBy: req.user.id
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
  const tests = await TestSeries.find().sort({ createdAt: -1 });
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
   PURCHASE TEST
=========================================== */
exports.purchaseTest = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    const alreadyPurchased = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    if (alreadyPurchased) {
      return res.status(400).json({
        message: "Test already purchased"
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

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


/* ===========================================
   GET AVAILABLE TESTS (NOT PURCHASED)
=========================================== */
exports.getAvailableTests = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    const purchasedIds = user.purchasedTests.map(
      t => t.testId.toString()
    );

    const tests = await TestSeries.find({
      _id: { $nin: purchasedIds }
    });

    res.json(tests);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET PURCHASED TESTS
=========================================== */
exports.getPurchasedTests = async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .populate("purchasedTests.testId");

    res.json(user.purchasedTests);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===========================================
   GET TEST STATUS (VERY IMPORTANT)
   - purchased?
   - expired?
   - completed?
=========================================== */
exports.getTestStatus = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    const purchased = user.purchasedTests.find(
      t => t.testId.toString() === testId
    );

    if (!purchased) {
      return res.json({ purchased: false });
    }

    const now = new Date();

    res.json({
      purchased: true,
      isCompleted: purchased.isCompleted,
      isExpired: now > purchased.expiresAt,
      expiresAt: purchased.expiresAt
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};