const mongoose = require("mongoose");
const User = require("../models/user");
const dotenv = require("dotenv");

dotenv.config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    const admin = await User.findOne({ email: "admin@gmail.com" });
    if (admin) {
      admin.password = "admin123";
      await admin.save();
      console.log("Password Reset for admin@gmail.com to admin123");
    } else {
      console.log("Admin admin@gmail.com not found");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

resetAdmin();
