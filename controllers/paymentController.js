const Razorpay = require("razorpay");
const crypto = require("crypto");
const Transaction = require("../models/transaction");
const BankDetails = require("../models/bankDetails");
const TestSeries = require("../models/testSeries");
const QuizSeries = require("../models/quizSeries");
const User = require("../models/user");
const AppError = require("../utils/AppError");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "secret_placeholder",
});

/* ===========================================
   CREATE PAYMENT ORDER
=========================================== */
exports.createOrder = async (req, res, next) => {
  try {
    const { testId, seriesId } = req.body;
    let amount = 0;
    let itemTitle = "";

    if (testId) {
      const test = await TestSeries.findById(testId);
      if (!test) return next(new AppError("Test not found", 404));
      amount = test.price;
      itemTitle = test.title;
    } else if (seriesId) {
      const series = await QuizSeries.findById(seriesId);
      if (!series) return next(new AppError("Series not found", 404));
      amount = series.price;
      itemTitle = series.title;
    }

    if (amount <= 0) {
      return next(new AppError("This item is free or price not set.", 400));
    }

    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Save pending transaction
    await Transaction.create({
      userId: req.user.id,
      testId,
      seriesId,
      orderId: order.id,
      amount,
      status: "pending"
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      itemTitle
    });

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   VERIFY PAYMENT & GRANT ACCESS
=========================================== */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "secret_placeholder")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return next(new AppError("Payment verification failed. Security breach detected.", 400));
    }

    // 1. Update Transaction
    const transaction = await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { paymentId: razorpay_payment_id, signature: razorpay_signature, status: "completed" },
      { new: true }
    );

    if (!transaction) return next(new AppError("Transaction record not found", 404));

    // 2. Grant Access to User
    const user = await User.findById(req.user.id);
    const expiresAt = new Date();
    
    if (transaction.testId) {
      expiresAt.setDate(expiresAt.getDate() + 3);
      user.purchasedTests.push({
        testId: transaction.testId,
        purchasedAt: new Date(),
        expiresAt,
        isCompleted: false
      });
    } else if (transaction.seriesId) {
      expiresAt.setDate(expiresAt.getDate() + 30);
      const papers = await TestSeries.find({ seriesId: transaction.seriesId });
      papers.forEach(paper => {
        const alreadyPurchased = user.purchasedTests.some(t => t.testId.toString() === paper._id.toString());
        if (!alreadyPurchased) {
          user.purchasedTests.push({
            testId: paper._id,
            purchasedAt: new Date(),
            expiresAt,
            isCompleted: false
          });
        }
      });
    }

    await user.save();

    res.json({ 
      message: "Payment verified. Intelligence access granted.", 
      transactionId: transaction._id 
    });

  } catch (err) {
    next(err);
  }
};

/* ===========================================
   BANK DETAILS (ADMIN)
=========================================== */
exports.getBankDetails = async (req, res, next) => {
  try {
    let details = await BankDetails.findOne();
    if (!details) {
      details = await BankDetails.create({
        accountHolder: "Quizaro Institutional",
        accountNumber: "0000000000",
        ifscCode: "IFSC0000",
        bankName: "Global Bank"
      });
    }
    res.json(details);
  } catch (err) {
    next(err);
  }
};

exports.updateBankDetails = async (req, res, next) => {
  try {
    const details = await BankDetails.findOneAndUpdate(
      {},
      { ...req.body, updatedBy: req.user.id },
      { new: true, upsert: true }
    );
    res.json({ message: "Institutional Bank Credentials updated.", details });
  } catch (err) {
    next(err);
  }
};
