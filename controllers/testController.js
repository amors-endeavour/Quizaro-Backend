const TestSeries = require("../models/testSeries")
const User = require("../models/user")

// Create Test (Admin)
exports.createTest = async (req, res) => {
  try {
    const test = await TestSeries.create({
      ...req.body,
      createdBy: req.user.id
    })

    res.status(201).json(test)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Get All Tests
exports.getAllTests = async (req, res) => {
  const tests = await TestSeries.find().sort({ createdAt: -1 })
  res.json(tests)
}

// Get Single Test
exports.getSingleTest = async (req, res) => {
  const test = await TestSeries.findById(req.params.testId)
  res.json(test)
}

// Purchase Test
exports.purchaseTest = async (req, res) => {
  const user = await User.findById(req.user.id)

  if (user.purchasedTests.includes(req.params.testId)) {
    return res.status(400).json({ message: "Already purchased" })
  }

  user.purchasedTests.push(req.params.testId)
  await user.save()

  res.json({ message: "Test purchased successfully" })
}