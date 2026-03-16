// const User = require("../models/user")
// const jwt = require("jsonwebtoken")

// // Generate JWT
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" })
// }

// // Register
// exports.register = async (req, res) => {
//   try {
//     const { name, email, password } = req.body

//     const existingUser = await User.findOne({ email })
//     if (existingUser) return res.status(400).json({ message: "User already exists" })

//     const user = await User.create({ name, email, password })

//     const token = generateToken(user._id)

//     res.status(201).json({ user, token })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// }

// // Login
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body

//     const user = await User.findOne({ email }).select("+password")
//     if (!user) return res.status(400).json({ message: "Invalid credentials" })

//     const isMatch = await user.comparePassword(password)
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" })

//     const token = generateToken(user._id)

//     res.json({ user, token })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// }

// // Profile
// exports.getProfile = async (req, res) => {
//   const user = await User.findById(req.user.id)
//   res.json(user)
// }

const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Generate JWT token
// Token contains user id and expires in 7 days
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.SECRET_KEY, // must match .env
    { expiresIn: "7d" }
  );
};


// ======================
// Register User
// ======================
exports.register = async (req, res) => {

  try {

    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate JWT token
    const token = generateToken(user._id);

    // Send token as cookie (used by isAuth middleware)
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false // set true in production (https)
    });

    // Send response
    res.status(201).json({
      user,
      token
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};


// ======================
// Login User
// ======================
exports.login = async (req, res) => {

  try {

    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // Compare entered password with hashed password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set cookie for authentication
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false
    });

    res.json({
      user,
      token
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};


// ======================
// Get Logged-in User Profile
// ======================
exports.getProfile = async (req, res) => {

  try {

    // req.user is set by isAuth middleware
    const user = await User.findById(req.user.id);

    res.json(user);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};