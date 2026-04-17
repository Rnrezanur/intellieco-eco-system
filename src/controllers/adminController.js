const AuditLog = require("../models/AuditLog");
const ReportSchedule = require("../models/ReportSchedule");
const User = require("../models/User");
const { logAdminAction } = require("../services/auditLogger");
const { buildCsvContent, buildPdfBuffer } = require("../services/reportService");

async function updateUserRole(req, res) {
  const { role } = req.body;
  const allowedRoles = ["user", "admin"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role selected." });
  }

  if (String(req.params.id) === String(req.session.user.id)) {
    return res.status(400).json({ message: "You cannot change your own role." });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  user.role = role;
  await user.save();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "role_changed",
    targetType: "User",
    targetId: user._id,
    details: {
      email: user.email,
      newRole: role
    }
  });

  return res.json({
    message: "User role updated successfully.",
    user: {
      id: user._id,
      role: user.role
    }
  });
}

async function exportCsvReport(req, res) {
  const csvContent = await buildCsvContent();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "report_downloaded",
    targetType: "Report",
    details: {
      format: "csv"
    }
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="intellieco-waste-report.csv"');
  return res.send(csvContent);
}

async function exportPdfReport(req, res) {
  const pdfBuffer = await buildPdfBuffer();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "report_downloaded",
    targetType: "Report",
    details: {
      format: "pdf"
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="intellieco-waste-report.pdf"');
  return res.send(pdfBuffer);
}

async function updateReportSchedule(req, res) {
  const { recipients, isActive } = req.body;
  const schedule = await ReportSchedule.findOne({ frequency: req.params.frequency });
  if (!schedule) {
    return res.status(404).json({ message: "Report schedule not found." });
  }

  schedule.recipients = String(recipients || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  schedule.isActive = Boolean(isActive);
  await schedule.save();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "report_schedule_updated",
    targetType: "ReportSchedule",
    targetId: schedule._id,
    details: {
      frequency: schedule.frequency,
      recipients: schedule.recipients,
      isActive: schedule.isActive
    }
  });

  return res.json({
    message: "Report schedule updated.",
    schedule
  });
}

async function getAuditLogs(req, res) {
  const logs = await AuditLog.find()
    .populate("adminUser", "name email")
    .sort({ createdAt: -1 })
    .limit(20);

  return res.json(logs);
}

module.exports = {
  updateUserRole,
  exportCsvReport,
  exportPdfReport,
  updateReportSchedule,
  getAuditLogs
};
