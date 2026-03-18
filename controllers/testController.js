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
   PURCHASE TEST
=========================================== */

exports.purchaseTest = async (req, res) => {

  const user = await User.findById(req.user.id);

  // Prevent duplicate purchase
  if (user.purchasedTests.includes(req.params.testId)) {
    return res.status(400).json({
      message: "Already purchased"
    });
  }

  user.purchasedTests.push(req.params.testId);

  await user.save();

  res.json({
    message: "Test purchased successfully"
  });
};