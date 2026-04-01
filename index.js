import express from "express";
import connectDb from "./config/connectDB.js";
import cors from "cors";
import dotenv from "dotenv";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

// ======================
// MIDDLEWARES
// ======================
import isAuth from "./middlewares/isAuth.js";
import isAdmin from "./middlewares/isAdmin.js";
import validate from "./middlewares/validate.js";

// ======================
// JOI SCHEMAS
// ======================
import { registerSchema, loginSchema } from "./validations/userValidation.js";
import { createTestSchema } from "./validations/testValidation.js";
import { addQuestionSchema } from "./validations/questionValidation.js";
import { submitTestSchema } from "./validations/attemptValidation.js";

// ======================
// CONTROLLERS
// ======================
import { register, login, getProfile } from "./controllers/userController.js";

import {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest,

  // 🔥 NEW USER PANEL CONTROLLERS
  getAvailableTests,
  getPurchasedTests,
  getTestStatus

} from "./controllers/testController.js";

import {
  addQuestion,
  getTestQuestions,
  updateQuestion,
  getAllQuestionsAdmin
} from "./controllers/questionController.js";

import {
  submitTest,
  getResult,
  getLeaderboard,

  // 🔥 NEW USER PANEL CONTROLLER
  getUserAttempts

} from "./controllers/attemptController.js";

import {
  getAllUsers,
  getAllTestsAdmin,
  getAllAttempts,
  deleteTest,
  deleteQuestion,
  updateTest,
  getAdminStats
} from "./controllers/adminController.js";

// ======================
// APP INIT
// ======================
const app = express();
const port = process.env.PORT || 4000;

import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000", // backend
  withCredentials: true, // ✅ GLOBAL
});

export default API;

// Required for EJS
app.set("view engine", "ejs");
app.set("views","./views");

dotenv.config();

connectDb();

app.use(bodyParser.json());
app.use(cookieParser());

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