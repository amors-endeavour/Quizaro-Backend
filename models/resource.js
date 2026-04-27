const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  fileType: {
    type: String,
    enum: ["pdf", "image", "other"],
    default: "pdf"
  },
  fileUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: "General"
  },
  isFree: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestSeries",
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Resource", resourceSchema);
