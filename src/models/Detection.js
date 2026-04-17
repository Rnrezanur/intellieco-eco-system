const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    imagePath: {
      type: String,
      required: true
    },
    predictedLabel: {
      type: String,
      required: true
    },
    modelVersion: {
      type: String,
      default: "1.0.0"
    },
    wasteType: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      default: 0
    },
    suggestion: {
      type: String,
      required: true
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "corrected"],
      default: "pending"
    },
    reviewedWasteType: String,
    reviewNote: String,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Detection", detectionSchema);
