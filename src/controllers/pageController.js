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

async function adminPage(req, res) {
  const [recentDetections, users, auditLogs, reportSchedules, pickupRequests] = await Promise.all([
    Detection.find().populate("reviewedBy", "name email").sort({ createdAt: -1 }).limit(12),
    User.find().sort({ createdAt: -1 }).select("name email role isVerified createdAt"),
    AuditLog.find().populate("adminUser", "name email").sort({ createdAt: -1 }).limit(10),
    ReportSchedule.find().sort({ frequency: 1 }),
    PickupRequest.find().populate("user", "name email").sort({ createdAt: -1 }).limit(20)
  ]);

  res.render("pages/admin", {
    title: "Admin Panel | IntelliEco",
    recentDetections,
    users,
    auditLogs,
    reportSchedules,
    pickupRequests
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
  adminPage,
  forgotPasswordPage,
  resetPasswordPage
};
