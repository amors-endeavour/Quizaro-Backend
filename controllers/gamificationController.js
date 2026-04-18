// =====================================================
// GAMIFICATION CONTROLLER 🔥
// Phase 2.7 — Points, badges, streaks, levels, favorites, profile
// =====================================================

const User = require("../models/user");
const Attempt = require("../models/attempt");
const AppError = require("../utils/AppError");
const { uploadToCloudinary } = require("../config/cloudinary");

// Points required per level threshold
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 11000, 16000, 22000];

function calculateLevel(points) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return level;
}

// Badge definitions — evaluated after every test submission
const BADGE_RULES = [
  { name: "First Blood",       icon: "🩸", description: "Completed your first test",           check: (u) => u.totalTestsAttempted === 1 },
  { name: "Perfect Score",     icon: "💯", description: "Scored 100% on a test",               check: (u, score, total) => score === total },
  { name: "Speed Demon",       icon: "⚡", description: "Completed a test in under 5 minutes", check: (u, s, t, timeTaken) => timeTaken && timeTaken < 300 },
  { name: "Consistent",        icon: "🔥", description: "Maintained a 7-day streak",           check: (u) => u.streak >= 7 },
  { name: "Centurion",         icon: "🏛️", description: "Attempted 100 tests",                 check: (u) => u.totalTestsAttempted >= 100 },
  { name: "Top 10",            icon: "🏆", description: "Ranked in top 10 globally",           check: (u, s, t, time, rank) => rank <= 10 },
  { name: "Scholar",           icon: "📚", description: "Attempted 10 tests",                  check: (u) => u.totalTestsAttempted >= 10 },
  { name: "High Achiever",     icon: "⭐", description: "Scored above 90% five times",         check: (u, s, t) => (s / t) >= 0.9 },
];

/* ===========================================
   AWARD GAMIFICATION (called internally after submit)
=========================================== */
exports.awardPostSubmit = async (userId, score, totalQuestions, timeTaken, rank) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const now = new Date();
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    const daysSinceActive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : 999;

    // Update streak
    let newStreak = user.streak;
    if (daysSinceActive === 1) newStreak += 1;          // Consecutive day
    else if (daysSinceActive > 1) newStreak = 1;         // Streak broken
    // daysSinceActive === 0 means same day, keep streak

    // Points: 10 per correct answer, bonus for speed and perfect score
    let pointsEarned = score * 10;
    if (score === totalQuestions) pointsEarned += 50;    // Perfect bonus
    if (timeTaken && timeTaken < 300) pointsEarned += 20; // Speed bonus
    if (rank === 1) pointsEarned += 100;                  // Global #1 bonus

    const newPoints = (user.points || 0) + pointsEarned;
    const newLevel = calculateLevel(newPoints);

    // Check which badges haven't been awarded yet
    const existingBadgeNames = user.badges.map(b => b.name);
    const newBadges = BADGE_RULES
      .filter(rule => !existingBadgeNames.includes(rule.name))
      .filter(rule => rule.check(user, score, totalQuestions, timeTaken, rank))
      .map(rule => ({ name: rule.name, description: rule.description, icon: rule.icon, awardedAt: now }));

    await User.findByIdAndUpdate(userId, {
      $set: { 
        points: newPoints,
        level: newLevel,
        streak: newStreak,
        lastActiveAt: now,
        totalTestsAttempted: (user.totalTestsAttempted || 0) + 1,
        totalScore: (user.totalScore || 0) + score
      },
      $push: { badges: { $each: newBadges } }
    });

    return { pointsEarned, newLevel, newBadges, newStreak };
  } catch (err) {
    console.error("Gamification error:", err);
  }
};

/* ===========================================
   GET USER PROFILE (extended)
=========================================== */
exports.getExtendedProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -resetPasswordToken -resetPasswordExpires -oauthId")
      .populate("favorites", "title category coverImage difficulty");

    if (!user) return next(new AppError("User not found", 404));
    
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   UPDATE PROFILE (bio, display name)
=========================================== */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (bio !== undefined) updateFields.bio = bio;
    if (phone !== undefined) updateFields.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: updateFields }, 
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "Profile updated", user });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   UPLOAD AVATAR
=========================================== */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError("No file uploaded", 400));
    const url = await uploadToCloudinary(req.file.path, "quizaro/avatars");
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: { avatar: url } }, 
      { new: true }
    ).select("-password");
    res.json({ message: "Avatar updated", avatar: url, user });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   TOGGLE FAVORITE SERIES
=========================================== */
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const user = await User.findById(req.user.id);
    const isFav = user.favorites.map(f => f.toString()).includes(seriesId);

    await User.findByIdAndUpdate(req.user.id, 
      isFav 
        ? { $pull: { favorites: seriesId } }
        : { $addToSet: { favorites: seriesId } }
    );

    res.json({ 
      message: isFav ? "Removed from favorites" : "Added to favorites",
      isFavorited: !isFav
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET FAVORITES
=========================================== */
exports.getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("favorites", "title category coverImage difficulty description isPublished");
    res.json(user.favorites || []);
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GET BADGES
=========================================== */
exports.getBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("badges points level streak");
    res.json({ 
      badges: user.badges, 
      points: user.points, 
      level: user.level, 
      streak: user.streak,
      nextLevelAt: LEVEL_THRESHOLDS[user.level] || null
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================================
   GENERATE REFERRAL CODE
=========================================== */
exports.generateReferralCode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.referralCode) return res.json({ referralCode: user.referralCode });

    const code = `QZ-${user.name.replace(/\s+/g, "").toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await User.findByIdAndUpdate(req.user.id, { $set: { referralCode: code } });
    res.json({ referralCode: code });
  } catch (err) {
    next(err);
  }
};
