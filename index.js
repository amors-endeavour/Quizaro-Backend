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
const { register, login, getProfile, forgotPassword, resetPassword } = require("./controllers/userController.js");

const {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest,
  getAvailableTests,
  getPurchasedTests,
  getTestStatus
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
  getUserAttempts
} = require("./controllers/attemptController.js");

const {
  getAllUsers,
  getAllTestsAdmin,
  getAllAttempts,
  deleteTest,
  deleteQuestion,
  updateTest,
  getAdminStats
} = require("./controllers/adminController.js");

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
app.post("/user/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ message: "Logged out successfully" });
});


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

// Get tests not yet purchased
app.get("/user/tests/available", isAuth, getAvailableTests);

// Get purchased tests
app.get("/user/tests/purchased", isAuth, getPurchasedTests);

// Get test status (purchased / expired / completed)
app.get("/user/test/status/:testId", isAuth, getTestStatus);


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

app.get("/admin/attempts", isAuth, isAdmin, getAllAttempts);

app.delete("/admin/test/:testId", isAuth, isAdmin, deleteTest);

app.delete("/admin/question/:questionId", isAuth, isAdmin, deleteQuestion);

app.put("/admin/question/:questionId", isAuth, isAdmin, updateQuestion);

app.put("/admin/test/:testId", isAuth, isAdmin, updateTest);

app.get("/admin/stats", isAuth, isAdmin, getAdminStats);

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