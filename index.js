const express = require("express");
const connectDb = require("./config/connectDB");
const cors = require("cors");
require("dotenv").config();
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./utils/AppError");


const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// ======================
// MIDDLEWARES
// ======================
const isAuth = require("./middlewares/isAuth");
const isAdmin = require("./middlewares/isAdmin");
const validate = require("./middlewares/validate");

// ======================
// JOI SCHEMAS
// ======================
const { registerSchema, loginSchema } = require("./validations/userValidation");
const { createTestSchema } = require("./validations/testValidation");
const { addQuestionSchema } = require("./validations/questionValidation");
const { submitTestSchema } = require("./validations/attemptValidation");

// ======================
// CONTROLLERS
// ======================
const { register, login, getProfile } = require("./controllers/userController");

const {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest,

  // 🔥 NEW USER PANEL CONTROLLERS
  getAvailableTests,
  getPurchasedTests,
  getTestStatus

} = require("./controllers/testController");

const {
  addQuestion,
  getTestQuestions
} = require("./controllers/questionController");

const {
  submitTest,
  getResult,
  getLeaderboard,

  // 🔥 NEW USER PANEL CONTROLLER
  getUserAttempts

} = require("./controllers/attemptController");

const {
  getAllUsers,
  getAllTestsAdmin,
  getAllAttempts,
  deleteTest,
  deleteQuestion,
  updateTest,
  getAdminStats
} = require("./controllers/adminController");
// ======================
// APP INIT
// ======================
const app = express();
const port = process.env.PORT || 4000;

// Required for EJS
app.set("view engine", "ejs");
app.set("views","./views");


connectDb();

app.use(bodyParser.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.PRODUCTION_URL,
  credentials: true
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

console.log("isAuth:", typeof isAuth);
console.log("purchaseTest:", typeof purchaseTest);
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

// Get questions for test attempt
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

app.put("/admin/test/:testId", isAuth, isAdmin, updateTest);

app.get("/admin/stats", isAuth, isAdmin, getAdminStats);

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