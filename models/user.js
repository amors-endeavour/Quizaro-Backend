// ======================
// STUDENTS & ADMINS SCHEMA
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
      required: function() { return this.oauthProvider === 'local'; },
      minlength: 6,
      select: false,
    },

    oauthProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },

    // Role of user (student or admin)
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    // Password Reset Fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    
    // Multi-factor Auth
    mfaSecret: {
      type: String,
      default: null,
    },
    isMfaEnabled: {
      type: Boolean,
      default: false,
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

        // Tracking fields for Pause/Resume 🔥
        startedAt: {
          type: Date,
          default: null
        },
        timeRemaining: {
          type: Number, // in seconds
          default: null
        },
        draftAnswers: [
          {
            questionId: String,
            selectedOption: Number
          }
        ]
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

    // ======================
    // GAMIFICATION 🔥
    // ======================
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    badges: [
      {
        name: String,
        description: String,
        icon: String,
        awardedAt: { type: Date, default: Date.now }
      }
    ],

    // ======================
    // PROFILE & SOCIAL 🔥
    // ======================
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: null,
    },
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizSeries"
    }],

    // Referral System 🔥
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ======================
    // OAUTH 🔥
    // ======================
    oauthProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    oauthId: {
      type: String,
      default: null,
    },

    // ======================
    // ACCOUNT CONTROLS 🔥
    // ======================
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true } // adds createdAt & updatedAt
);


// ======================
// HASH PASSWORD BEFORE SAVING
// ======================
userSchema.pre("save", async function () {

  // Only hash if password is new or modified
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);

  // Replace plain password with hashed password
  this.password = await bcrypt.hash(this.password, salt);

});


// ======================
// COMPARE PASSWORD METHOD (FOR LOGIN)
// ======================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


// ======================
// EXPORT MODEL
// ======================
module.exports =  mongoose.model("User", userSchema);