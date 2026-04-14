const TestSeries = require("../models/testSeries");
const User = require("../models/user");
const AppError = require("../utils/AppError");

/* ===========================================
   CREATE TEST (Admin Only)
=========================================== */
exports.createTest = async (req, res, next) => {
  try {
    const testData = { ...req.body };
    // Mongoose ObjectId validation fails on empty string
    if (testData.seriesId === "") delete testData.seriesId;

    const test = await TestSeries.create({
      ...testData,
      createdBy: req.user.id
    });

    res.status(201).json(test);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET ALL TESTS
=========================================== */
exports.getAllTests = async (req, res, next) => {
  try {
    const tests = await TestSeries.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET SINGLE TEST
=========================================== */
exports.getSingleTest = async (req, res, next) => {
  try {
    const test = await TestSeries.findById(req.params.testId);

    if (!test) {
      return next(new AppError("Test not found", 404));
    }

    res.json(test);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   PURCHASE TEST
=========================================== */
exports.purchaseTest = async (req, res, next) => {
  try {

    const user = await User.findById(req.user.id);
    const testId = req.params.testId;

    const alreadyPurchased = user.purchasedTests.find(
      (test) => test.testId.toString() === testId
    );

    if (alreadyPurchased) {
      return next(new AppError("Test already purchased", 400));
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
    next(error);
  }
};


/* ===========================================
   GET AVAILABLE TESTS (NOT PURCHASED)
=========================================== */
exports.getAvailableTests = async (req, res, next) => {
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
    next(err);
  }
};


/* ===========================================
   GET PURCHASED TESTS
=========================================== */
exports.getPurchasedTests = async (req, res, next) => {
  try {

    const user = await User.findById(req.user.id)
      .populate("purchasedTests.testId");

    res.json(user.purchasedTests);

  } catch (err) {
    next(err);
  }
};


/* ===========================================
   GET TEST STATUS (VERY IMPORTANT)
   - purchased?
   - expired?
   - completed?
=========================================== */
exports.getTestStatus = async (req, res, next) => {
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
      expiresAt: purchased.expiresAt,
      // Persistence fields 🔥
      startedAt: purchased.startedAt,
      timeRemaining: purchased.timeRemaining,
      draftAnswers: purchased.draftAnswers
    });

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   SYNC PROGRESS
=========================================== */
exports.syncProgress = async (req, res, next) => {
  try {
    const { testId, startedAt, timeRemaining, draftAnswers } = req.body;
    const user = await User.findById(req.user.id);

    const testIndex = user.purchasedTests.findIndex(
      (t) => t.testId.toString() === testId
    );

    if (testIndex === -1) {
      return next(new AppError("Test not found in user purchases", 404));
    }

    user.purchasedTests[testIndex].startedAt = startedAt;
    user.purchasedTests[testIndex].timeRemaining = timeRemaining;
    user.purchasedTests[testIndex].draftAnswers = draftAnswers;

    await user.save();

    res.json({ message: "Progress synced successfully" });
  } catch (err) {
    next(err);
  }
};