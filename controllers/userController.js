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
    { expiresIn: "7d" }
  );
};


// ======================
// Register User (Admin + Student)
// ======================
exports.register = async (req, res) => {

  try {

    // Get role also from request
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Restrict admin creation (basic validation)
      const assignedRole = role === "admin" ? "admin" : "student";

      const user = await User.create({
        name,
        email,
        password,
        role: assignedRole
      });

    // Generate token with role
    const token = generateToken(user._id, user.role);

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false
    });

    res.status(201).json({
      user,
      token,
      role: user.role
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};

// ======================
// Login User / Admin
// ======================
exports.login = async (req, res) => {

  try {

    // Get email & password from request body
    const { email, password } = req.body;

    // Find user by email and explicitly include password
    // (password is hidden in schema using select: false)
    const user = await User.findOne({ email }).select("+password");

    // If user does not exist → invalid login
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // Compare entered password with hashed password in DB
    const isMatch = await user.comparePassword(password);

    // If password does not match → invalid login
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // Generate JWT token using user ID and Role
   const token = generateToken(user._id, user.role);

    // Store token in HTTP-only cookie (used for authentication)
    res.cookie("authToken", token, {
      httpOnly: true,   // prevents access from frontend JS (security)
      secure: false     // set to true in production (HTTPS)
    });

    // Send response back to client
    // Include role to differentiate admin vs student on frontend
    res.json({
      user,             // user details
      token,            // JWT token
      role: user.role   // ⭐ used for redirect (admin / student)
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