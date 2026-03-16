// const jwt = require("jsonwebtoken")
// require('dotenv').config()



// const isAuth = (req, res, next) => {

//     try {


//         const token = req.cookies.authToken   // query paramter ?token=  // param /:token

//         // console.log("token" , token)

//         if (token === undefined || token === null) {
//             return res.status(401).json({ message: "UnAuthorised Kindly Login again !" })
//         }

//         const verifyToken = jwt.verify(token, process.env.SECRET)

//         if (verifyToken) {

//             req.user = verifyToken    // verifytoken details are saved in req.user object then the next() is called

//             next()
//         } else {

//             return res.status(403).json({ message: "Forbidden to access !" })
//         }


//     } catch (error) {
//         console.log(error)
//         // return res.status(500).json({ message: "Internal server Error !" })
//     }

// }


// module.exports = isAuth


const jwt = require("jsonwebtoken");
require("dotenv").config();

// Authentication middleware
// This middleware verifies JWT token before allowing access to protected routes

const isAuth = (req, res, next) => {

  try {

    // Token is expected in cookies
    const token = req.cookies.authToken;

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