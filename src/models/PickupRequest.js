const mongoose = require("mongoose");

const pickupRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    wasteType: {
      type: String,
      required: true
    },
    imagePath: {
      type: String,
      default: ""
    },
    linkedDetection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Detection",
      default: null
    },
    linkedDetections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Detection"
      }
    ],
    approximateWeightKg: {
      type: Number,
      required: true,
      min: 0.1
    },
    detectedItems: [
      {
        wasteType: {
          type: String,
          required: true
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1
        }
      }
    ],
    contactPhone: {
      type: String,
      required: true
    },
    addressLine: {
      type: String,
      required: true
    },
    areaName: {
      type: String,
      required: true
    },
    latitude: Number,
    longitude: Number,
    notes: String,
    status: {
      type: String,
      enum: ["pending", "assigned", "picked_up"],
      default: "pending"
    },
    assignedTo: {
      type: String,
      default: ""
    },
    rewardPoints: {
      type: Number,
      default: 0
    },
    rewardStatus: {
      type: String,
      enum: ["pending", "earned"],
      default: "pending"
    },
    rewardedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PickupRequest", pickupRequestSchema);
