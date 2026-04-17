const mongoose = require("mongoose");

const reportScheduleSchema = new mongoose.Schema(
  {
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true
    },
    recipients: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastSentAt: Date,
    nextRunLabel: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ReportSchedule", reportScheduleSchema);
