const express = require("express")
const connectDb = require("./config/connectDB")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")

const isAuth = require("./middlewares/isAuth");
const isAdmin = require("./middlewares/isAdmin");
// Controllers
const {
  register,
  login,
  getProfile
} = require("./controllers/userController")

const {
  createTest,
  getAllTests,
  getSingleTest,
  purchaseTest
} = require("./controllers/testController")

const {
  addQuestion,
  getTestQuestions
} = require("./controllers/questionController")

const {
  submitTest,
  getResult,
  getLeaderboard
} = require("./controllers/attemptController")

const app = express()
const port = process.env.PORT || 4000

connectDb()

app.use(bodyParser.json())
app.use(cookieParser())

app.use(cors({
  origin: process.env.PRODUCTION_URL,
  credentials: true
}))

app.use('/uploads', express.static('uploads'))

app.get("/", (req, res) => {
  res.send("Study Test Series API Running")
})


/* ===========================
   USER ROUTES
=========================== */

app.post("/user/register", register)
app.post("/user/login", login)
app.get("/user/profile", isAuth, getProfile)

/* ===========================
   DASHBOARD CONTROL ROUTE
=========================== */
app.get("/admin/dashboard", isAuth, isAdmin, (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user
  });
});

/* ===========================
   TEST SERIES ROUTES
=========================== */

// Admin creates test
app.post("/test/create", isAuth,isAdmin, createTest)

// Fetch all tests
app.get("/tests", getAllTests)

// Get single test details
app.get("/test/:testId", getSingleTest)

// Purchase test
app.post("/test/purchase/:testId", isAuth, purchaseTest)


/* ===========================
   QUESTION ROUTES
=========================== */

// Admin adds unlimited questions
app.post("/question/add/:testId", isAuth,isAdmin, addQuestion)

// Get questions for test attempt
app.get("/questions/:testId", isAuth, getTestQuestions)


/* ===========================
   ATTEMPT & RESULT ROUTES
=========================== */

// Submit test
app.post("/test/submit/:testId", isAuth, submitTest)

// Get result (correct, wrong, explanation)
app.get("/result/:attemptId", isAuth, getResult)

// Leaderboard
app.get("/leaderboard/:testId", getLeaderboard)


app.listen(port, () => {
  console.log(`Server running on port ${port}`)
});

// ======================
// Logout User
// ======================
app.post("/user/logout", (req, res) => {

  // Clear cookie
  res.clearCookie("authToken");

  res.json({
    message: "Logged out successfully"
  });

});