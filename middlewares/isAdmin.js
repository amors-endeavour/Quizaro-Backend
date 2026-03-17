// ======================
// Admin Middleware
// ======================
const isAdmin = (req, res, next) => {

  // DEBUG: check what is coming in req.user
  console.log("USER DATA:", req.user);

  // Check if logged-in user is admin
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }

  // If admin → allow access
  next();
};

module.exports = isAdmin;