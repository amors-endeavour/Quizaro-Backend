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
  fileSize: {
    type: String,
    default: "0"
  },
  tags: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    default: "General"
  },
  isFree: {
    type: Boolean,
    default: true
  },
  price: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = mongoose.model("Resource", resourceSchema);
