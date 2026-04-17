const express = require("express");

const adminController = require("../controllers/adminController");
const pageController = require("../controllers/pageController");
const statsController = require("../controllers/statsController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, asyncHandler(pageController.adminPage));
router.get("/stats", requireAdmin, asyncHandler(statsController.getAdminStats));
router.get("/audit-logs", requireAdmin, asyncHandler(adminController.getAuditLogs));
router.post("/users/:id/role", requireAdmin, asyncHandler(adminController.updateUserRole));
router.post(
  "/report-schedules/:frequency",
  requireAdmin,
  asyncHandler(adminController.updateReportSchedule)
);
router.get("/reports/csv", requireAdmin, asyncHandler(adminController.exportCsvReport));
router.get("/reports/pdf", requireAdmin, asyncHandler(adminController.exportPdfReport));

module.exports = router;
