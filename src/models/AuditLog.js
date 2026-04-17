const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    actionType: {
      type: String,
      required: true
    },
    targetType: {
      type: String,
      required: true
    },
    targetId: String,
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
