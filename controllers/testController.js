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
   GET ALL TESTS (Public/Student View)
=========================================== */
exports.getAllTests = async (req, res, next) => {
  try {
    // 🔥 ONLY SHOW LIVE TESTS TO USERS
    const tests = await TestSeries.find({ isPublished: true })
      .sort({ createdAt: -1 });
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

    const test = await TestSeries.findById(testId);
    if (!test) {
       return next(new AppError("Test not found", 404));
    }

    // SIMULATED PAYMENT BYPASS 🔥
    // In production, we would verify a paymentId here.
    // if (test.price > 0 && !req.body.paymentId) {
    //    return next(new AppError("Premium Paper: Transaction required to unlock.", 402));
    // }

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
   PURCHASE SERIES
=========================================== */
exports.purchaseSeries = async (req, res, next) => {
  try {
    const seriesId = req.params.seriesId;
    const user = await User.findById(req.user.id);
    
    // Find all papers in this series
    const papers = await TestSeries.find({ seriesId });
    
    if (papers.length === 0) {
      return next(new AppError("No papers found in this series", 404));
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for series

    let addedCount = 0;
    papers.forEach(paper => {
      const alreadyPurchased = user.purchasedTests.find(
        (t) => t.testId.toString() === paper._id.toString()
      );

      if (!alreadyPurchased) {
        user.purchasedTests.push({
          testId: paper._id,
          purchasedAt: new Date(),
          expiresAt,
          isCompleted: false
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await user.save();
    }

    res.json({
      message: `Enrolled in ${addedCount} new papers in this series.`,
      totalPapers: papers.length
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
/* ===========================================
   GRANT ACCESS (Admin Only)
=========================================== */
exports.grantAccess = async (req, res, next) => {
  try {
    const { userEmail, testId, seriesId } = req.body;
    
    const user = await User.findOne({ email: userEmail });
    if (!user) return next(new AppError("User not found", 404));

    let papersToGrant = [];

    if (seriesId) {
      papersToGrant = await TestSeries.find({ seriesId });
    } else if (testId) {
      const paper = await TestSeries.findById(testId);
      if (paper) papersToGrant = [paper];
    }

    if (papersToGrant.length === 0) {
      return next(new AppError("No valid papers found to grant", 404));
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days grant

    papersToGrant.forEach(paper => {
       const exists = user.purchasedTests.some(t => t.testId.toString() === paper._id.toString());
       if (!exists) {
          user.purchasedTests.push({
             testId: paper._id,
             purchasedAt: new Date(),
             expiresAt,
             isCompleted: false
          });
       }
    });

    await user.save();
    res.json({ message: `Access granted to ${papersToGrant.length} papers for ${user.name}` });

  } catch (err) {
    next(err);
  }
};