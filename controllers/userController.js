const User = require("../models/user");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.SECRET_KEY,
    { expiresIn: "30d" }
  );
};


// ======================
// Register User (Only Students)
// ======================
exports.register = async (req, res, next) => {
  try {

    const { name, email, password, role } = req.body;

    if (role === "admin") {
      return next(new AppError("Admin cannot register. Please login.", 403));
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return next(new AppError("User already exists", 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "student"
    });

    const token = generateToken(user._id, user.role);

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      user,
      token,
      role: user.role
    });

  } catch (err) {
    next(err);
  }
};


// ======================
// Login User / Admin
// ======================
exports.login = async (req, res, next) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new AppError("Invalid credentials", 400));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return next(new AppError("Invalid credentials", 400));
    }

    const token = generateToken(user._id, user.role);

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    user.password = undefined;

    res.json({
      user,
      token,
      role: user.role
    });

  } catch (err) {
    next(err);
  }
};


// ======================
// Get Logged-in User Profile
// ======================
exports.getProfile = async (req, res, next) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.json(user);

  } catch (error) {
    next(error);
  }
};