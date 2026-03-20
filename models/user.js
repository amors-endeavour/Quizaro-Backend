// ======================
// Students & Admins Schema
// ======================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // User name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // User email (unique)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Hashed password (hidden in queries)
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // Role of user (student or admin)
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    // ======================
    // Purchased Tests (IMPORTANT FEATURE 🔥)
    // ======================
    purchasedTests: [
      {
        // Reference to test
        testId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TestSeries",
        },

        // When user purchased the test
        purchasedAt: {
          type: Date,
          default: Date.now,
        },

        // Expiry time (3 days after purchase)
        expiresAt: {
          type: Date,
        },

        // Whether user has completed the test
        isCompleted: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Total number of tests attempted
    totalTestsAttempted: {
      type: Number,
      default: 0,
    },

    // Total score accumulated
    totalScore: {
      type: Number,
      default: 0,
    },

    // Ranking points (for leaderboard)
    rankPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// ======================
// Hash password before saving
// ======================
userSchema.pre("save", async function () {

  // Only hash if password is new or modified
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);

  // Replace plain password with hashed password
  this.password = await bcrypt.hash(this.password, salt);

});


// ======================
// Compare password method (for login)
// ======================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


// Export model
module.exports = mongoose.model("User", userSchema);