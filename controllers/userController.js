const User = require("../models/user");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const { transporter } = require("../config/nodemailer");
const { sendWelcomeEmail } = require("../config/emailService");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.SECRET_KEY || process.env.JWT_SECRET || "your_secret_key",
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

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Send welcome email asynchronously
    sendWelcomeEmail(user).catch(console.error);

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

    let user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("Login failed: no user found with email", email);
      return next(new AppError("Invalid credentials", 401));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("Login failed: password mismatch for", email);
      return next(new AppError("Invalid credentials", 401));
    }

    console.log("Login successful for", email, "with role:", user.role);

    const token = generateToken(user._id, user.role);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      totalTestsAttempted: user.totalTestsAttempted,
      totalScore: user.totalScore,
      rankPoints: user.rankPoints,
      purchasedTests: user.purchasedTests
    });

  } catch (error) {
    next(error);
  }
};


// ======================
// Forgot Password - Send Reset Link
// ======================
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("No user found with this email", 404));
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save reset token to database (expires in 15 minutes)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Build reset link
    const resetLink = `${process.env.FRONTEND_URL || "https://quizaro-frontend.vercel.app"}/reset-password?token=${resetToken}`;

    // Send email in production, return token in development
    if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
      try {
        await transporter.sendMail({
          from: `"Quizaro" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: "Password Reset - Quizaro",
          html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;margin:16px 0;">Reset Password</a>
            <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          `
        });

        res.json({
          message: "Password reset link sent to your email"
        });
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
        res.json({
          message: "Password reset link generated (email failed, using fallback)",
          resetToken,
          resetLink
        });
      }
    } else {
      res.json({
        message: "Password reset link sent to your email",
        resetToken,
        resetLink
      });
    }

  } catch (err) {
    next(err);
  }
};


// ======================
// Reset Password
// ======================
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError("Token and new password are required", 400));
    }

    if (newPassword.length < 6) {
      return next(new AppError("Password must be at least 6 characters", 400));
    }

    // Hash the token from URL
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      message: "Password reset successful. You can now login with your new password."
    });

  } catch (err) {
    next(err);
  }
};


// ======================
// OAuth Callback Generation
// ======================
exports.oauthCallback = (req, res) => {
  const user = req.user;
  const token = generateToken(user._id, user.role);
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("authToken", token, {
    httpOnly: true,
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000, 
    sameSite: isProduction ? "none" : "lax"
  });

  res.redirect(process.env.FRONTEND_URL || "http://localhost:3000/user-dashboard");
};

// ======================
// Logout User
// ======================
exports.logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
};

// ======================
// Enable MFA (Generate Secret + QR)
// ======================
exports.enableMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError("User not found", 404));

    const secret = speakeasy.generateSecret({ name: `QuizaroPlatform (${user.email})` });
    user.mfaSecret = secret.base32;
    await user.save();

    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return next(new AppError("Failed to generate QR code", 500));
      res.json({ secret: secret.base32, qrCode: data_url });
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// Verify MFA
// ======================
exports.verifyMfa = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || (!user.mfaSecret && req.body.isFirstTime !== true)) return next(new AppError("User MFA not configured", 400));

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.isMfaEnabled = true;
      await user.save();
      res.json({ message: "MFA Authentication successful" });
    } else {
      return next(new AppError("Invalid MFA token", 401));
    }
  } catch (err) {
    next(err);
  }
};