const mongoose = require("mongoose");
const User = require("../models/user");
const dotenv = require("dotenv");

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      console.log("Admin Found:", admin.email);
    } else {
      console.log("No Admin Found. Creating one...");
      const newAdmin = await User.create({
        name: "Admin User",
        email: "admin@quizaro.com",
        password: "adminpassword123",
        role: "admin"
      });
      console.log("Admin Created: admin@quizaro.com / adminpassword123");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAdmin();
