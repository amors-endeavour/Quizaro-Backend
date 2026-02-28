const User = require("../models/user")
const jwt = require("jsonwebtoken")

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" })
}

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ message: "User already exists" })

    const user = await User.create({ name, email, password })

    const token = generateToken(user._id)

    res.status(201).json({ user, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select("+password")
    if (!user) return res.status(400).json({ message: "Invalid credentials" })

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" })

    const token = generateToken(user._id)

    res.json({ user, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id)
  res.json(user)
}