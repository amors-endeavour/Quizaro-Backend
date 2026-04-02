const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Authentication middleware
// This middleware verifies JWT token before allowing access to protected routes

const isAuth = (req, res, next) => {

  try {

    // Token can be in cookies or Authorization header
    const tokenFromCookie = req.cookies.authToken;
    const tokenFromHeader = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = tokenFromCookie || tokenFromHeader;

    // If token is missing → user not logged in
    if (!token) {
      return res.status(401).json({ message: "Unauthorized. Please login again." });
    }

    // Verify token using secret key
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);

    // Save decoded user info in request object
    req.user = verifyToken;

    // Continue to next middleware / controller
    next();

  } catch (error) {

    console.log("JWT Error:", error);

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }

};

module.exports = isAuth;