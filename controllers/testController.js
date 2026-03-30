import TestSeries from "../models/testSeries.js";
import User from "../models/user.js";
import AppError from "../utils/AppError.js";

/* ===========================================
   CREATE TEST (Admin Only)
=========================================== */
export const createTest = async (req, res, next) => {
  try {
    const test = await TestSeries.create({
      ...req.body,
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
export const getAllTests = async (req, res, next) => {
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
export const getSingleTest = async (req, res, next) => {
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
export const purchaseTest = async (req, res, next) => {
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
export const getAvailableTests = async (req, res, next) => {
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
export const getPurchasedTests = async (req, res, next) => {
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
export const getTestStatus = async (req, res, next) => {
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
    next(err);
  }
};