const express = require("express");
const connectDb = require("./config/connectDB");
const cors = require("cors");
const dotenv = require("dotenv");
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./utils/AppError");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// ======================
// MIDDLEWARES
// ======================
const isAuth = require("./middlewares/isAuth.js");
const isAdmin = require("./middlewares/isAdmin.js");
const validate = require("./middlewares/validate.js");
const { multMid } = require("./middlewares/multer.js");
const { uploadToCloudinary } = require("./config/cloudinary.js");

// ======================
// JOI SCHEMAS
// ======================
const { registerSchema, loginSchema } = require("./validations/userValidation.js");
const { createTestSchema } = require("./validations/testValidation.js");
const { addQuestionSchema } = require("./validations/questionValidation.js");
const { submitTestSchema } = require("./validations/attemptValidation.js");

// ======================
// CONTROLLERS
// ======================
const { register, login, getProfile, forgotPassword, resetPassword, logout } = require("./controllers/userController.js");

const {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest,
  purchaseSeries,
  getAvailableTests,
  getPurchasedTests,
  getTestStatus,
  syncProgress,
  grantAccess
} = require("./controllers/testController.js");

const {
  addQuestion,
  getTestQuestions,
  updateQuestion,
  getAllQuestionsAdmin
} = require("./controllers/questionController.js");

const {
  submitTest,
  getResult,
  getLeaderboard,
  getGlobalLeaderboard,
  getUserAttempts
} = require("./controllers/attemptController.js");

const {
  updateTest,
  getAdminStats,
  getQuestionAnalytics,
  exportPaperJSON,
  importFullPaper,
  createSeries,
  getAllSeries,
  getSeriesDetails,
  updateSeries,
  deleteSeries,
  getAllUsers,
  getAllTestsAdmin,
  getAllAttempts,
  getRecentAttempts,
  deleteTest,
  deleteQuestion
} = require("./controllers/adminController.js");

// === NEW PHASE 2 CONTROLLERS ===
const {
  getExtendedProfile,
  updateProfile,
  uploadAvatar,
  toggleFavorite,
  getFavorites,
  getBadges,
  generateReferralCode
} = require("./controllers/gamificationController.js");

const {
  getHint,
  flagQuestion,
  getFlaggedQuestions,
  unflagQuestion,
  retakeTest,
  getTestAttemptHistory,
  cloneSeries,
  toggleSeriesPublish,
  toggleUserBan,
  getUserActivity
} = require("./controllers/engagementController.js");

// ======================
// APP INIT
// ======================
const app = express();
const port = process.env.PORT || 4000;

// Required for EJS
app.set("view engine", "ejs");
app.set("views","./views");

dotenv.config();

connectDb();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(cookieParser());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:3000", "https://quizaro-frontend.vercel.app"];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow localhost, vercel.app subdomains, and configured origins
    const isAllowed = allowedOrigins.includes(origin)
      || origin.match(/https?:\/\/.*\.vercel\.app$/)
      || origin.match(/http:\/\/localhost/)
      || origin.match(/http:\/\/127\.0\.0\.1/);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ======================
// ROOT
// ======================
app.get("/", (req, res) => {
  res.send("Study Test Series API Running");
});


// ===========================
// USER ROUTES
// ===========================
app.post("/user/register", validate(registerSchema), register);
app.post("/user/login", validate(loginSchema), login);
app.get("/user/profile", isAuth, getProfile);
app.post("/user/forgot-password", forgotPassword);
app.post("/user/reset-password", resetPassword);

// ===========================
// LOGOUT
// ===========================
app.post("/user/logout", logout);


// ===========================
// ADMIN DASHBOARD
// ===========================
app.get("/admin/dashboard", isAuth, isAdmin, (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user
  });
});


// ===========================
// TEST ROUTES
// ===========================

// Admin creates test
app.post("/test/create", isAuth, isAdmin, validate(createTestSchema), createTest);

// All tests (public)
app.get("/tests", getAllTests);

// Single test
app.get("/test/:testId", getSingleTest);

// Purchase test
app.post("/test/purchase/:testId", isAuth, purchaseTest);


// ===========================
// 🔥 USER PANEL TEST ROUTES
// ===========================

app.post("/test/purchase/:testId", isAuth, purchaseTest);
app.post("/user/series/purchase/:seriesId", isAuth, purchaseSeries); // Enrollment for Series 🔥
app.get("/user/tests/available", isAuth, getAvailableTests);

// Get purchased tests
app.get("/user/tests/purchased", isAuth, getPurchasedTests);

// Get test status (purchased / expired / completed)
app.get("/user/test/status/:testId", isAuth, getTestStatus);

// Sync test progress 🔥
app.post("/user/test/sync/:testId", isAuth, syncProgress);

// Grant access (Admin Only) 🔥
app.post("/admin/grant-access", isAuth, isAdmin, grantAccess);


// ===========================
// QUESTION ROUTES
// ===========================

// Admin adds questions
app.post("/question/add/:testId", isAuth, isAdmin, validate(addQuestionSchema), addQuestion);

// Admin gets all questions (with answers)
app.get("/admin/questions/:testId", isAuth, isAdmin, getAllQuestionsAdmin);

// Get questions for test attempt (user - hides answers)
app.get("/questions/:testId", isAuth, getTestQuestions);


// ===========================
// ATTEMPT ROUTES
// ===========================

// Submit test
app.post("/test/submit/:testId", isAuth, validate(submitTestSchema), submitTest);

// Get result
app.get("/result/:attemptId", isAuth, getResult);

// Leaderboard
app.get("/leaderboard/:testId", getLeaderboard);


// ===========================
// 🔥 USER PANEL ATTEMPT ROUTES
// ===========================

// Get user attempt history
app.get("/user/attempts", isAuth, getUserAttempts);

/* ===========================
   ADMIN DASHBOARD ROUTES
=========================== */

app.get("/admin/users", isAuth, isAdmin, getAllUsers);

app.get("/admin/tests", isAuth, isAdmin, getAllTestsAdmin);

app.get("/admin/leaderboard/global", isAuth, getGlobalLeaderboard);
app.get("/admin/attempts/recent", isAuth, isAdmin, getRecentAttempts);

app.delete("/admin/test/:testId", isAuth, isAdmin, deleteTest);

app.delete("/admin/question/:questionId", isAuth, isAdmin, deleteQuestion);

app.put("/admin/question/:questionId", isAuth, isAdmin, updateQuestion);

app.put("/admin/test/:testId", isAuth, isAdmin, updateTest);

app.get("/admin/stats", isAuth, isAdmin, getAdminStats);
app.get("/admin/analytics/:testId", isAuth, isAdmin, getQuestionAnalytics);
app.get("/admin/export/:testId", isAuth, isAdmin, exportPaperJSON);
app.post("/admin/import", isAuth, isAdmin, importFullPaper);

/* ===========================
   ADMIN SERIES ROUTES
=========================== */
app.post("/admin/series/create", isAuth, isAdmin, createSeries);
app.get("/admin/series", isAuth, isAdmin, getAllSeries);
app.get("/admin/series/:seriesId", isAuth, isAdmin, getSeriesDetails);
app.put("/admin/series/:seriesId", isAuth, isAdmin, updateSeries);
app.delete("/admin/series/:seriesId", isAuth, isAdmin, deleteSeries);

// Public Series Route
app.get("/series", getAllSeries);
app.get("/series/:seriesId", getSeriesDetails);

/* ===========================
   FILE UPLOAD ROUTE
=========================== */

app.post("/admin/upload", isAuth, isAdmin, multMid, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = await uploadToCloudinary(req.file.path, "quizaro");
    res.json({ message: "Upload successful", url });
  } catch (err) {
    next(err);
  }
});

/* ===========================
   PHASE 2 — GAMIFICATION ROUTES 🔥
=========================== */

// Extended user profile
app.get("/user/profile/extended", isAuth, getExtendedProfile);
app.put("/user/profile", isAuth, updateProfile);
app.post("/user/profile/avatar", isAuth, multMid, uploadAvatar);
app.post("/user/referral", isAuth, generateReferralCode);

// Badges & Points
app.get("/user/badges", isAuth, getBadges);

// Favorites
app.post("/user/favorites/:seriesId", isAuth, toggleFavorite);
app.get("/user/favorites", isAuth, getFavorites);

/* ===========================
   PHASE 2 — ENGAGEMENT ROUTES 🔥
=========================== */

// Hints
app.get("/question/hint/:questionId", isAuth, getHint);

// Question flagging
app.post("/question/flag/:questionId", isAuth, flagQuestion);
app.get("/admin/questions/flagged", isAuth, isAdmin, getFlaggedQuestions);
app.put("/admin/question/:questionId/unflag", isAuth, isAdmin, unflagQuestion);

// Retakes
app.post("/test/retake/:testId", isAuth, retakeTest);
app.get("/user/attempts/:testId/history", isAuth, getTestAttemptHistory);

// Series clone & publish
app.post("/admin/series/:id/clone", isAuth, isAdmin, cloneSeries);
app.put("/admin/series/:id/publish", isAuth, isAdmin, toggleSeriesPublish);

// Admin user management
app.put("/admin/user/:userId/ban", isAuth, isAdmin, toggleUserBan);
app.get("/admin/user/:userId/activity", isAuth, isAdmin, getUserActivity);

// Handle unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error middleware
app.use(errorHandler);


// ===========================
// SERVER
// ===========================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});