const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    const connectionString = process.env.MONGO_URI;

    if (!connectionString) {
      console.error("MONGO_URI is not defined in environment variables");
      process.exit(1);
    }

    await mongoose.connect(connectionString);
    console.log("Db Connected");

  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDb;