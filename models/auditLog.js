const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resourceType: {
    type: String,
    required: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  }
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
