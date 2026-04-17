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

    // Clear the problematic index once to fix the duplicate referralCode error
    try {
      const User = mongoose.model("User");
      await User.collection.dropIndex("referralCode_1");
      console.log("Dropped problematic referralCode index");
    } catch (err) {
      // Index might not exist or already dropped, which is fine
    }

  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDb;