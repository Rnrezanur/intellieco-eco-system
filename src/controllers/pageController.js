const Detection = require("../models/Detection");
const AuditLog = require("../models/AuditLog");
const PickupRequest = require("../models/PickupRequest");
const ReportSchedule = require("../models/ReportSchedule");
const User = require("../models/User");

async function homePage(req, res) {
  res.render("pages/home", { title: "IntelliEco | Smart Waste Recycling" });
}

function loginPage(req, res) {
  res.render("pages/login", { title: "Login | IntelliEco" });
}

function registerPage(req, res) {
  res.render("pages/register", { title: "Register | IntelliEco" });
}

function verifyAccountPage(req, res) {
  res.render("pages/verify-account", { title: "Verify Account | IntelliEco" });
}

async function dashboardPage(req, res) {
  if (req.session.user.role === "admin") {
    return res.redirect("/admin");
  }

  const [history, pickupRequests, userAccount] = await Promise.all([
    Detection.find({ user: req.session.user.id }).sort({ createdAt: -1 }),
    PickupRequest.find({ user: req.session.user.id }).sort({ createdAt: -1 }),
    User.findById(req.session.user.id).select("rewardPoints totalRewardedPickups")
  ]);
  res.render("pages/dashboard", {
    title: "Dashboard | IntelliEco",
    history,
    pickupRequests,
    rewardSummary: {
      points: userAccount?.rewardPoints || 0,
      rewardedPickups: userAccount?.totalRewardedPickups || 0
    },
    modelConfig: {
      modelUrl: process.env.CUSTOM_MODEL_URL || "/models/waste-classifier/model.json",
      metadataUrl: process.env.CUSTOM_METADATA_URL || "/models/waste-classifier/metadata.json",
      version: process.env.CURRENT_MODEL_VERSION || "1.0.0"
    }
  });
}

async function profilePage(req, res) {
  const profileUser = await User.findById(req.session.user.id).select(
    "name email role profileImage rewardPoints totalRewardedPickups createdAt"
  );

  if (!profileUser) {
    req.flash("error", "Please log in again to update your profile.");
    return res.redirect("/login");
  }

  res.render("pages/profile", {
    title: "My Profile | IntelliEco",
    profileUser
  });
}

async function adminPage(req, res) {
  const [
    recentDetections,
    users,
    auditLogs,
    reportSchedules,
    pickupRequests,
    totalPickupRequests,
    pendingPickups,
    collectedWeight
  ] = await Promise.all([
    Detection.find().populate("reviewedBy", "name email").sort({ createdAt: -1 }).limit(12),
    User.find().sort({ createdAt: -1 }).select("name email role isVerified createdAt"),
    AuditLog.find().populate("adminUser", "name email").sort({ createdAt: -1 }).limit(10),
    ReportSchedule.find().sort({ frequency: 1 }),
    PickupRequest.find()
      .populate("user", "name email")
      .populate("linkedDetection", "imagePath wasteType confidence modelVersion")
      .sort({ createdAt: -1 })
      .limit(20),
    PickupRequest.countDocuments(),
    PickupRequest.countDocuments({ status: { $ne: "picked_up" } }),
    PickupRequest.aggregate([
      { $match: { status: "picked_up" } },
      { $group: { _id: null, total: { $sum: "$approximateWeightKg" } } }
    ])
  ]);

  res.render("pages/admin", {
    title: "Admin Panel | IntelliEco",
    recentDetections,
    users,
    auditLogs,
    reportSchedules,
    pickupRequests,
    adminSummary: {
      totalPickupRequests,
      totalWasteCollected: collectedWeight[0]?.total || 0,
      activeUsers: users.filter((user) => user.isVerified).length,
      pendingPickups
    }
  });
}

function forgotPasswordPage(req, res) {
  res.render("pages/forgot-password", { title: "Forgot Password | IntelliEco" });
}

function resetPasswordPage(req, res) {
  res.render("pages/reset-password", {
    title: "Reset Password | IntelliEco",
    token: req.params.token
  });
}

module.exports = {
  homePage,
  loginPage,
  registerPage,
  verifyAccountPage,
  dashboardPage,
  profilePage,
  adminPage,
  forgotPasswordPage,
  resetPasswordPage
};
