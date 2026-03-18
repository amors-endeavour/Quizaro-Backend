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
// Generate JWT token with user id + role
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },   // ⭐ include role
    process.env.SECRET_KEY,
    { expiresIn: "30d" }
  );
};


// ======================
// Register User (Only Students)
// ======================
exports.register = async (req, res) => {

  try {

    // Get user details from request body
    const { name, email, password, role } = req.body;

    // ======================
    // ❌ Prevent Admin Registration
    // Admin accounts are already created manually in DB
    // ======================
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin cannot register. Please login."
      });
    }

    // ======================
    // Check if user already exists
    // ======================
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // ======================
    // Create new user (force role = student)
    // Even if role is sent from frontend, we override it
    // ======================
    const user = await User.create({
      name,
      email,
      password,
      role: "student"
    });

    // ======================
    // Generate JWT token (includes id + role)
    // ======================
    const token = generateToken(user._id, user.role);

    // ======================
    // Store token in HTTP-only cookie
    // Session valid for 30 days
    // ======================
    res.cookie("authToken", token, {
      httpOnly: true, // prevents JS access (security)
      secure: false,  // set true in production (HTTPS)
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // ======================
    // Send response to frontend
    // ======================
    res.status(201).json({
      user,
      token,
      role: user.role
    });

  } catch (err) {

    // Handle unexpected errors
    res.status(500).json({
      error: err.message
    });

  }

};



// ======================
// Login User / Admin
// ======================
exports.login = async (req, res) => {

  try {

    // ======================
    // Get email & password from request body
    // ======================
    const { email, password } = req.body;

    // ======================
    // Find user by email
    // Include password explicitly (hidden in schema)
    // ======================
    const user = await User.findOne({ email }).select("+password");

    // If user not found → invalid credentials
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // ======================
    // Compare entered password with hashed password
    // ======================
    const isMatch = await user.comparePassword(password);

    // If password incorrect → invalid credentials
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // ======================
    // Generate JWT token (includes id + role)
    // ======================
    const token = generateToken(user._id, user.role);

    // ======================
    // Store token in HTTP-only cookie
    // Valid for 30 days (persistent session)
    // ======================
    res.cookie("authToken", token, {
      httpOnly: true, // prevents JS access (security)
      secure: false,  // set true in production (HTTPS)
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // ======================
    // Remove password before sending response
    // (IMPORTANT SECURITY FIX)
    // ======================
    user.password = undefined;

    // ======================
    // Send response
    // Role is used by frontend for redirection
    // ======================
    res.json({
      user,
      token,
      role: user.role
    });

  } catch (err) {

    // Handle unexpected server errors
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