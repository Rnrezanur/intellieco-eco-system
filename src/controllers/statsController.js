const mongoose = require("mongoose");
const Detection = require("../models/Detection");
const User = require("../models/User");

async function getUserStats(req, res) {
  const userId = new mongoose.Types.ObjectId(req.session.user.id);

  const [totalDetections, wasteBreakdown, dailyTrend] = await Promise.all([
    Detection.countDocuments({ user: userId }),
    Detection.aggregate([
        { $match: { user: userId } },
      { $group: { _id: "$wasteType", total: { $sum: 1 } } },
      { $sort: { total: -1, _id: 1 } }
    ]),
    Detection.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  return res.json({
    totalDetections,
    wasteBreakdown,
    dailyTrend
  });
}

async function getAdminStats(req, res) {
  const [
    totalUsers,
    verifiedUsers,
    totalDetections,
    wasteBreakdown,
    recentUsers,
    versionBreakdown,
    reviewSummary
  ] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Detection.countDocuments(),
      Detection.aggregate([
        { $group: { _id: "$wasteType", total: { $sum: 1 } } },
        { $sort: { total: -1, _id: 1 } }
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select("name email role isVerified createdAt"),
      Detection.aggregate([
        {
          $group: {
            _id: "$modelVersion",
            total: { $sum: 1 },
            averageConfidence: { $avg: "$confidence" }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Detection.aggregate([
        {
          $group: {
            _id: "$reviewStatus",
            total: { $sum: 1 }
          }
        }
      ])
    ]);

  return res.json({
    totalUsers,
    verifiedUsers,
    totalDetections,
    wasteBreakdown,
    recentUsers,
    versionBreakdown,
    reviewSummary
  });
}

module.exports = {
  getUserStats,
  getAdminStats
};
