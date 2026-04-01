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
  getTestQuestions,
  updateQuestion,
  getAllQuestionsAdmin
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

const axios = require("axios");

const API = axios.create({
  baseURL: "http://localhost:4000", // backend
  withCredentials: true, // ✅ GLOBAL
});

module.exports = API;

// Required for EJS
app.set("view engine", "ejs");
app.set("views","./views");

dotenv.config();

connectDb();

app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://quizaro-frontend.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({
  origin: ["http://localhost:3000", "https://quizaro-frontend.vercel.app"],
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