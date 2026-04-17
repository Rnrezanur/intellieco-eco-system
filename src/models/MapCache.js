const mongoose = require("mongoose");

const mapCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true
    },
    query: {
      type: String,
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("MapCache", mapCacheSchema);
