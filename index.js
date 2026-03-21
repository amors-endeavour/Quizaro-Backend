const express = require("express");
const connectDb = require("./config/connectDB");
const cors = require("cors");
require("dotenv").config();

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// Middlewares
const isAuth = require("./middlewares/isAuth");
const isAdmin = require("./middlewares/isAdmin");
const validate = require("./middlewares/validate");

// Joi Schemas
const { registerSchema, loginSchema } = require("./validations/userValidation");
const { createTestSchema } = require("./validations/testValidation");
const { addQuestionSchema } = require("./validations/questionValidation");
const { submitTestSchema } = require("./validations/attemptValidation");

// Controllers
const { register, login, getProfile } = require("./controllers/userController");
const {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest
} = require("./controllers/testController");

const {
  addQuestion,
  getTestQuestions
} = require("./controllers/questionController");

const {
  submitTest,
  getResult,
  getLeaderboard
} = require("./controllers/attemptController");

const app = express();
const port = process.env.PORT || 4000;

connectDb();

app.use(bodyParser.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.PRODUCTION_URL,
  credentials: true
}));

app.get("/", (req, res) => {
  res.send("Study Test Series API Running");
});

/* ===========================
   USER ROUTES
=========================== */

app.post("/user/register", validate(registerSchema), register);
app.post("/user/login", validate(loginSchema), login);
app.get("/user/profile", isAuth, getProfile);

/* ===========================
   ADMIN DASHBOARD
=========================== */

app.get("/admin/dashboard", isAuth, isAdmin, (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user
  });
});

/* ===========================
   TEST ROUTES
=========================== */

app.post("/test/create", isAuth, isAdmin, validate(createTestSchema), createTest);
app.get("/tests", getAllTests);
app.get("/test/:testId", getSingleTest);
app.post("/test/purchase/:testId", isAuth, purchaseTest);

/* ===========================
   QUESTION ROUTES
=========================== */

app.post("/question/add/:testId", isAuth, isAdmin, validate(addQuestionSchema), addQuestion);
app.get("/questions/:testId", isAuth, getTestQuestions);

/* ===========================
   ATTEMPT ROUTES
=========================== */

app.post("/test/submit/:testId", isAuth, validate(submitTestSchema), submitTest);
app.get("/result/:attemptId", isAuth, getResult);
app.get("/leaderboard/:testId", getLeaderboard);

/* ===========================
   LOGOUT
=========================== */

app.post("/user/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ message: "Logged out successfully" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});