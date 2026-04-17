const crypto = require("crypto");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString("hex")
    },
    verificationCode: {
      type: String,
      default: () => String(Math.floor(100000 + Math.random() * 900000))
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    rewardPoints: {
      type: Number,
      default: 0
    },
    totalRewardedPickups: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
