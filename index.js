const express = require("express");
const connectDb = require("./config/connectDB");
const cors = require("cors");
const dotenv = require("dotenv");
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./utils/AppError");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// ======================
// MIDDLEWARES
// ======================
const isAuth = require("./middlewares/isAuth.js");
const isAdmin = require("./middlewares/isAdmin.js");
const validate = require("./middlewares/validate.js");
const { multMid, uploadAvatarMid } = require("./middlewares/multer.js");
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
const { register, login, getProfile, forgotPassword, resetPassword, logout, enableMfa, verifyMfa, oauthCallback } = require("./controllers/userController.js");
const passport = require("./config/passport");

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
  toggleTestPublish,
  getRevenueStats,
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
  deleteQuestion,
  getRevenue,
  grantRole,
  getAuditLogs
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

const { 
  createOrder, 
  verifyPayment, 
  getBankDetails, 
  updateBankDetails 
} = require("./controllers/paymentController.js");

const { exportResultToPDF } = require("./controllers/exportController.js");

// ======================
// APP INIT
// ======================
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Required for EJS
app.set("view engine", "ejs");
app.set("views","./views");

const initCronJobs = require("./utils/cronJobs");

dotenv.config();

connectDb();
initCronJobs();

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many accounts created from this IP." });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts." });

// ======================
// MIDDLEWARES
// ======================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));

// Setup Global Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware to inject IO object into every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Configure Helmet for Cross-Origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(bodyParser.json({ limit: "10mb" }));
app.use(cookieParser());

// Unified Modern Sanitizer (NoSQL + XSS) - Express 5 & Node 22 Compatible
app.use((req, res, next) => {
  const deepSanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Check if the object itself is writable
    if (Object.isFrozen(obj)) return obj;

    for (let key in obj) {
      // 1. NoSQL Injection Protection (Remove keys starting with $)
      if (key.startsWith('$')) {
        delete obj[key];
        continue;
      }

      const value = obj[key];
      if (typeof value === 'string') {
        // 2. XSS Protection (Remove <script> tags)
        obj[key] = value.replace(/<script.*?>.*?<\/script>/gi, '').trim();
      } else if (typeof value === 'object') {
        deepSanitize(value);
      }
    }
  };

  // Only sanitize the Body (Express 5 protects req.query/req.params)
  if (req.body) deepSanitize(req.body);
  next();
});

// HTTP request logging
app.use(morgan("combined"));

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client Connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client Disconnected: ${socket.id}`);
  });
});

// ======================
// ROOT & SEEDING
// ======================
app.get("/", (req, res) => {
  res.send("Study Test Series API Running");
});

// ===========================
// USER ROUTES
// ===========================
app.post("/user/register", registerLimiter, validate(registerSchema), register);
app.post("/user/login", loginLimiter, validate(loginSchema), login);
app.get("/user/profile", isAuth, getProfile);
app.post("/user/forgot-password", forgotPassword);
app.post("/user/reset-password", resetPassword);
app.post("/user/mfa/enable", isAuth, enableMfa);
app.post("/user/mfa/verify", isAuth, verifyMfa);

// ===========================
// OAUTH ROUTES
// ===========================
app.use(passport.initialize());
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
app.get("/auth/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }), oauthCallback);

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

// Export result to PDF 🔥
app.get("/result/:attemptId/export", isAuth, exportResultToPDF);

// Leaderboard
app.get("/leaderboard/:testId", getLeaderboard);


// ===========================
// 🔥 USER PANEL ATTEMPT ROUTES
// ===========================

// Get user attempt history
app.get("/user/attempts", isAuth, getUserAttempts);


const {
  getResources,
  addResource,
  deleteResource
} = require("./controllers/resourceController.js");

// ===========================
// 🔥 RESOURCE ROUTES
// ===========================
app.get("/user/resources", isAuth, getResources);
app.post("/admin/resource/add", isAuth, isAdmin, addResource);
app.delete("/admin/resource/:id", isAuth, isAdmin, deleteResource);

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
app.put("/admin/test/publish/:testId", isAuth, isAdmin, toggleTestPublish);
app.get("/admin/stats", isAuth, isAdmin, getAdminStats);
app.get("/admin/analytics/:testId", isAuth, isAdmin, getQuestionAnalytics);
app.get("/admin/export/:testId", isAuth, isAdmin, exportPaperJSON);
app.post("/admin/import", isAuth, isAdmin, importFullPaper);
app.get("/admin/revenue", isAuth, isAdmin, getRevenue);
app.post("/admin/grant-role", isAuth, isAdmin, grantRole);
app.get("/admin/audit-logs", isAuth, isAdmin, getAuditLogs);

// ===========================
// 🔥 PAYMENT ROUTES (TASK 1)
// ===========================
app.post("/payment/order", isAuth, createOrder);
app.post("/payment/verify", isAuth, verifyPayment);
app.get("/admin/bank-details", isAuth, isAdmin, getBankDetails);
app.put("/admin/bank-details", isAuth, isAdmin, updateBankDetails);

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
app.post("/user/profile/avatar", isAuth, uploadAvatarMid, uploadAvatar);
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
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});