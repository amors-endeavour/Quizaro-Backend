// =====================================================
// DATABASE CONNECTION (MongoDB)
// Connects the application to MongoDB Atlas
// =====================================================

const mongoose = require("mongoose");

// Function to connect to database
const connectDb = async () => {
  try {

    // Get MongoDB connection string from environment variables
    const connectionString = process.env.MONGO_URI;

    // Connect to MongoDB Atlas
    await mongoose.connect(connectionString);

    console.log("Db Connected");

  } catch (error) {

    // Log connection errors
    console.error("Database connection error:", error);

  }
};


// =====================================================
// EXPORT FUNCTION
// =====================================================
module.exports = connectDb;